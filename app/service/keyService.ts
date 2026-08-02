import { apiService } from './apiService';
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

let cachedMk: Uint8Array | null = null;

export const getMasterKey = async (): Promise<Uint8Array | null> => {
    if (cachedMk) return cachedMk;
    const stored = await getStoredMasterKey();
    if (!stored) return null;
    cachedMk = base64.decode(stored);
    return cachedMk;
};

const storeMasterKey = async (mk: Uint8Array): Promise<void> => {
    cachedMk = mk;
    await saveMasterKey(base64.encode(mk));
};

export const lockLocal = async (): Promise<void> => {
    cachedMk = null;
    await clearMasterKey();
};

/** First-time key setup. Returns the recovery code to show the user ONCE. */
const createKeys = async (password: string): Promise<string> => {
    const mk = generateMasterKey();

    const salt = generateSaltB64();
    const kek = await deriveKek(password, salt, DEFAULT_KDF);
    const wrapped = wrapBytes(kek, mk);

    const recoveryCode = generateRecoveryCode();
    const recoverySalt = generateSaltB64();
    const recoveryKek = await deriveKek(recoveryCode, recoverySalt, DEFAULT_KDF);
    const recoveryWrapped = wrapBytes(recoveryKek, mk);

    await apiService.putKeys({
        wrappedKey: wrapped.wrapped,
        wrapNonce: wrapped.nonce,
        salt,
        kdf: DEFAULT_KDF,
        recoveryWrappedKey: recoveryWrapped.wrapped,
        recoveryNonce: recoveryWrapped.nonce,
        recoverySalt,
        keyVersion: 1,
    });
    await storeMasterKey(mk);
    return formatRecoveryCode(recoveryCode);
};

/**
 * Unlock after login/signup. If no keys exist yet, creates them and returns
 * the recovery code (show it once). Throws WrongPasswordError when the
 * password can't unwrap the stored key (e.g. password was reset by email).
 */
export const unlockWithPassword = async (password: string): Promise<{ recoveryCode?: string }> => {
    const keys = await apiService.getKeys();
    if (!keys) {
        return { recoveryCode: await createKeys(password) };
    }
    const kek = await deriveKek(password, keys.salt, keys.kdf);
    try {
        const mk = unwrapBytes(kek, keys.wrappedKey, keys.wrapNonce);
        await storeMasterKey(mk);
        return {};
    } catch (error) {
        if (error instanceof DecryptionError) throw new WrongPasswordError();
        throw error;
    }
};

/** After the account password changes, re-wrap the same MK under the new one. */
export const rewrapWithNewPassword = async (newPassword: string): Promise<void> => {
    const mk = await getMasterKey();
    if (!mk) throw new Error('Data is locked — unlock before changing password');
    const keys = await apiService.getKeys();
    if (!keys) throw new Error('No encryption keys found');

    const salt = generateSaltB64();
    const kek = await deriveKek(newPassword, salt, DEFAULT_KDF);
    const wrapped = wrapBytes(kek, mk);

    await apiService.putKeys({
        ...keys,
        wrappedKey: wrapped.wrapped,
        wrapNonce: wrapped.nonce,
        salt,
        kdf: DEFAULT_KDF,
        keyVersion: keys.keyVersion + 1,
    });
};

/** Issue a fresh recovery code (invalidates the old one). Shows once. */
export const regenerateRecoveryCode = async (): Promise<string> => {
    const mk = await getMasterKey();
    if (!mk) throw new Error('Data is locked');
    const keys = await apiService.getKeys();
    if (!keys) throw new Error('No encryption keys found');

    const recoveryCode = generateRecoveryCode();
    const recoverySalt = generateSaltB64();
    const recoveryKek = await deriveKek(recoveryCode, recoverySalt, DEFAULT_KDF);
    const recoveryWrapped = wrapBytes(recoveryKek, mk);

    await apiService.putKeys({
        ...keys,
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
    const keys = await apiService.getKeys();
    if (!keys?.recoveryWrappedKey || !keys.recoverySalt || !keys.recoveryNonce) {
        throw new Error('No recovery code was set up for this account');
    }
    const code = normalizeRecoveryCode(codeInput);
    const recoveryKek = await deriveKek(code, keys.recoverySalt, keys.kdf);

    let mk: Uint8Array;
    try {
        mk = unwrapBytes(recoveryKek, keys.recoveryWrappedKey, keys.recoveryNonce);
    } catch (error) {
        if (error instanceof DecryptionError) throw new WrongPasswordError('Invalid recovery code');
        throw error;
    }
    await storeMasterKey(mk);

    const salt = generateSaltB64();
    const kek = await deriveKek(currentPassword, salt, DEFAULT_KDF);
    const wrapped = wrapBytes(kek, mk);

    // Burn the redeemed code and issue a fresh one.
    const nextCode = generateRecoveryCode();
    const nextRecoverySalt = generateSaltB64();
    const nextRecoveryKek = await deriveKek(nextCode, nextRecoverySalt, DEFAULT_KDF);
    const nextRecoveryWrapped = wrapBytes(nextRecoveryKek, mk);

    await apiService.putKeys({
        ...keys,
        wrappedKey: wrapped.wrapped,
        wrapNonce: wrapped.nonce,
        salt,
        kdf: DEFAULT_KDF,
        recoveryWrappedKey: nextRecoveryWrapped.wrapped,
        recoveryNonce: nextRecoveryWrapped.nonce,
        recoverySalt: nextRecoverySalt,
        keyVersion: keys.keyVersion + 1,
    });
    return formatRecoveryCode(nextCode);
};

/**
 * Last resort: deletes all encrypted data server-side and starts over with a
 * fresh master key. Returns the new recovery code.
 */
export const resetEncryptedData = async (password: string): Promise<string> => {
    await apiService.deleteKeys();
    await lockLocal();
    return createKeys(password);
};
