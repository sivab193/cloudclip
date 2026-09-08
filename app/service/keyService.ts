import { apiService } from './apiService';
import { auth } from '../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { randomUUID } from 'expo-crypto';
import { saveMasterKey, getStoredMasterKey, clearMasterKey } from './keyStore';
import {
    DEFAULT_KDF,
    DecryptionError,
    base64,
    deriveKek,
    formatRecoveryCode,
    generateMasterKey,
    generateRecoveryCode,
    generateSaltB64,
    normalizeRecoveryCode,
    unwrapBytes,
    wrapBytes,
} from './cryptoService';

/**
 * Orchestrates the E2E key lifecycle: create/unlock at login, re-wrap on
 * password change, recovery-code fallback, destructive reset.
 */

export class WrongPasswordError extends Error {
    constructor(message = 'Could not unlock your data with that password') {
        super(message);
        this.name = 'WrongPasswordError';
    }
}

let cached: { uid: string; keyId?: string; mk: Uint8Array } | null = null;
let generation = 0;
let storageQueue: Promise<unknown> = Promise.resolve();
const inKeyStoreOrder = <T>(work: () => Promise<T>): Promise<T> => {
    const result = storageQueue.then(work, work);
    storageQueue = result.catch(() => undefined);
    return result;
};

const accountSession = () => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    return { uid: auth.currentUser.uid, user: auth.currentUser, generation };
};
type AccountSession = ReturnType<typeof accountSession>;
const currentSession = (session: AccountSession) =>
    auth.currentUser === session.user && generation === session.generation;
const assertAccount = (session: AccountSession) => {
    if (!currentSession(session)) throw new Error('Account or encryption changed; unlock again');
};

export const verifyAccountPassword = async (password: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Not authenticated');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    if (auth.currentUser !== user) throw new Error('Account changed; try again');
};

export const getMasterKey = async (verifyRemote = false): Promise<Uint8Array | null> => {
    if (!auth.currentUser) return null;
    const session = accountSession();
    const { uid } = session;
    if (cached?.uid !== uid) {
        cached = null;
        const stored = await inKeyStoreOrder(getStoredMasterKey);
        if (!stored || !currentSession(session)) return null;
        try {
            const record = JSON.parse(stored);
            if (record.uid !== uid) return null;
            const mk = base64.decode(record.key);
            if (mk.length !== 32) return null;
            cached = { uid, keyId: record.keyId, mk };
        } catch { return null; } // Unscoped keys from older installs require unlock.
    }
    if (verifyRemote) {
        const keys = await apiService.getKeys();
        if (!currentSession(session)) return null;
        if (!keys || keys.keyId !== cached?.keyId) {
            await lockLocal();
            return null;
        }
    }
    return currentSession(session) && cached?.uid === uid ? cached?.mk ?? null : null;
};

/** Binds ciphertext writes to the exact unlocked key, including legacy keys. */
export const getMasterKeyId = (mk: Uint8Array): string | null => {
    if (!cached || cached.uid !== auth.currentUser?.uid || cached.mk !== mk) {
        throw new Error('Encryption changed; unlock your data and try again');
    }
    return cached.keyId ?? null;
};

const storeMasterKey = (session: AccountSession, mk: Uint8Array, keyId?: string): Promise<void> =>
    inKeyStoreOrder(async () => {
        assertAccount(session);
        await saveMasterKey(JSON.stringify({ uid: session.uid, keyId, key: base64.encode(mk) }));
        assertAccount(session);
        cached = { uid: session.uid, keyId, mk };
    });

export const lockLocal = async (): Promise<void> => {
    generation++;
    cached = null;
    await inKeyStoreOrder(clearMasterKey);
};

/** First-time key setup. Returns the recovery code to show the user ONCE. */
const createKeys = async (password: string): Promise<string> => {
    const session = accountSession();
    await verifyAccountPassword(password);
    assertAccount(session);
    await apiService.syncUser();
    const mk = generateMasterKey();
    const keyId = randomUUID();

    const salt = generateSaltB64();
    const kek = await deriveKek(password, salt, DEFAULT_KDF);
    const wrapped = wrapBytes(kek, mk);

    const recoveryCode = generateRecoveryCode();
    const recoverySalt = generateSaltB64();
    const recoveryKek = await deriveKek(recoveryCode, recoverySalt, DEFAULT_KDF);
    const recoveryWrapped = wrapBytes(recoveryKek, mk);

    assertAccount(session);
    await apiService.putKeys({
        keyId,
        wrappedKey: wrapped.wrapped,
        wrapNonce: wrapped.nonce,
        salt,
        kdf: DEFAULT_KDF,
        recoveryKdf: DEFAULT_KDF,
        recoveryWrappedKey: recoveryWrapped.wrapped,
        recoveryNonce: recoveryWrapped.nonce,
        recoverySalt,
        keyVersion: 1,
    });
    await storeMasterKey(session, mk, keyId);
    return formatRecoveryCode(recoveryCode);
};

/**
 * Unlock after login/signup. If no keys exist yet, creates them and returns
 * the recovery code (show it once). Throws WrongPasswordError when the
 * password can't unwrap the stored key (e.g. password was reset by email).
 */
export const unlockWithPassword = async (password: string): Promise<{ recoveryCode?: string }> => {
    const session = accountSession();
    const keys = await apiService.getKeys();
    assertAccount(session);
    if (!keys) {
        return { recoveryCode: await createKeys(password) };
    }
    const kek = await deriveKek(password, keys.salt, keys.kdf);
    try {
        const mk = unwrapBytes(kek, keys.wrappedKey, keys.wrapNonce);
        await storeMasterKey(session, mk, keys.keyId);
        return {};
    } catch (error) {
        if (error instanceof DecryptionError) throw new WrongPasswordError();
        throw error;
    }
};

/** After the account password changes, re-wrap the same MK under the new one. */
export const rewrapWithNewPassword = async (newPassword: string): Promise<void> => {
    const session = accountSession();
    const mk = await getMasterKey(true);
    if (!mk) throw new Error('Data is locked — unlock before changing password');
    const keys = await apiService.getKeys();
    if (!keys) throw new Error('No encryption keys found');
    if ((keys.keyId ?? null) !== getMasterKeyId(mk)) throw new Error('Encryption changed; unlock again');

    const salt = generateSaltB64();
    const kek = await deriveKek(newPassword, salt, DEFAULT_KDF);
    const wrapped = wrapBytes(kek, mk);

    assertAccount(session);
    await apiService.putKeys({
        ...keys,
        recoveryKdf: keys.recoveryKdf ?? keys.kdf,
        wrappedKey: wrapped.wrapped,
        wrapNonce: wrapped.nonce,
        salt,
        kdf: DEFAULT_KDF,
        keyVersion: keys.keyVersion + 1,
    });
};

/** Issue a fresh recovery code (invalidates the old one). Shows once. */
export const regenerateRecoveryCode = async (): Promise<string> => {
    const session = accountSession();
    const mk = await getMasterKey(true);
    if (!mk) throw new Error('Data is locked');
    const keys = await apiService.getKeys();
    if (!keys) throw new Error('No encryption keys found');
    if ((keys.keyId ?? null) !== getMasterKeyId(mk)) throw new Error('Encryption changed; unlock again');

    const recoveryCode = generateRecoveryCode();
    const recoverySalt = generateSaltB64();
    const recoveryKek = await deriveKek(recoveryCode, recoverySalt, DEFAULT_KDF);
    const recoveryWrapped = wrapBytes(recoveryKek, mk);

    assertAccount(session);
    await apiService.putKeys({
        ...keys,
        recoveryKdf: DEFAULT_KDF,
        recoveryWrappedKey: recoveryWrapped.wrapped,
        recoveryNonce: recoveryWrapped.nonce,
        recoverySalt,
        keyVersion: keys.keyVersion + 1,
    });
    return formatRecoveryCode(recoveryCode);
};

/**
 * Recover access with the recovery code (after a password reset). Unwraps the
 * MK and re-wraps it under the user's current (new) account password.
 *
 * The used code is single-use: it is replaced in the same write that re-wraps
 * the password KEK, so a code that leaked (email, screenshot, password
 * manager export) stops working the moment it is redeemed. Returns the new
 * code, which must be shown to the user ONCE.
 */
export const recoverWithCode = async (codeInput: string, currentPassword: string): Promise<string> => {
    const session = accountSession();
    await verifyAccountPassword(currentPassword);
    assertAccount(session);
    const keys = await apiService.getKeys();
    if (!keys?.recoveryWrappedKey || !keys.recoverySalt || !keys.recoveryNonce) {
        throw new Error('No recovery code was set up for this account');
    }
    const code = normalizeRecoveryCode(codeInput);
    const recoveryKek = await deriveKek(code, keys.recoverySalt, keys.recoveryKdf ?? keys.kdf);

    let mk: Uint8Array;
    try {
        mk = unwrapBytes(recoveryKek, keys.recoveryWrappedKey, keys.recoveryNonce);
    } catch (error) {
        if (error instanceof DecryptionError) throw new WrongPasswordError('Invalid recovery code');
        throw error;
    }

    const salt = generateSaltB64();
    const kek = await deriveKek(currentPassword, salt, DEFAULT_KDF);
    const wrapped = wrapBytes(kek, mk);

    // Burn the redeemed code and issue a fresh one.
    const nextCode = generateRecoveryCode();
    const nextRecoverySalt = generateSaltB64();
    const nextRecoveryKek = await deriveKek(nextCode, nextRecoverySalt, DEFAULT_KDF);
    const nextRecoveryWrapped = wrapBytes(nextRecoveryKek, mk);

    assertAccount(session);
    await apiService.putKeys({
        ...keys,
        recoveryKdf: DEFAULT_KDF,
        wrappedKey: wrapped.wrapped,
        wrapNonce: wrapped.nonce,
        salt,
        kdf: DEFAULT_KDF,
        recoveryWrappedKey: nextRecoveryWrapped.wrapped,
        recoveryNonce: nextRecoveryWrapped.nonce,
        recoverySalt: nextRecoverySalt,
        keyVersion: keys.keyVersion + 1,
    });
    await storeMasterKey(session, mk, keys.keyId);
    return formatRecoveryCode(nextCode);
};

/**
 * Last resort: deletes all encrypted data server-side and starts over with a
 * fresh master key. Returns the new recovery code.
 */
export const resetEncryptedData = async (password: string): Promise<string> => {
    const session = accountSession();
    await verifyAccountPassword(password);
    assertAccount(session);
    await apiService.deleteKeys();
    if (auth.currentUser !== session.user) throw new Error('Account changed; sign in again');
    await lockLocal();
    if (auth.currentUser !== session.user) throw new Error('Account changed; sign in again');
    return createKeys(password);
};
