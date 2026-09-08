jest.mock('../../firebaseConfig', () => ({ auth: { currentUser: { uid: 'a', email: 'a@example.com' } } }));
jest.mock('firebase/auth', () => ({
    EmailAuthProvider: { credential: jest.fn() },
    reauthenticateWithCredential: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('../keyStore', () => ({
    saveMasterKey: jest.fn().mockResolvedValue(undefined),
    getStoredMasterKey: jest.fn().mockResolvedValue(null),
    clearMasterKey: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../apiService', () => ({ apiService: {
    getKeys: jest.fn(), putKeys: jest.fn(), deleteKeys: jest.fn(), syncUser: jest.fn(),
} }));
jest.mock('../cryptoService', () => ({
    ...jest.requireActual('../cryptoService'),
    DEFAULT_KDF: { name: 'scrypt', N: 2048, r: 8, p: 1 },
}));

import { auth } from '../../firebaseConfig';
import { reauthenticateWithCredential } from 'firebase/auth';
import { apiService } from '../apiService';
import { saveMasterKey, getStoredMasterKey } from '../keyStore';
import { getMasterKey, lockLocal, unlockWithPassword, rewrapWithNewPassword, recoverWithCode, resetEncryptedData } from '../keyService';
import { base64, generateMasterKey, generateSaltB64, deriveKek, wrapBytes } from '../cryptoService';
import { EncryptionKeys } from '../models';

let keys: EncryptionKeys | null;
const oldKdf = { name: 'scrypt' as const, N: 1024, r: 8, p: 1 };
async function seedKeys() {
    const mk = generateMasterKey();
    const salt = generateSaltB64();
    const recoverySalt = generateSaltB64();
    const wrapped = wrapBytes(await deriveKek('old password', salt, oldKdf), mk);
    const recovery = wrapBytes(await deriveKek('ABCDEFGHIJKLMNOPQRST', recoverySalt, oldKdf), mk);
    keys = { keyId: '11111111-1111-4111-8111-111111111111', wrappedKey: wrapped.wrapped, wrapNonce: wrapped.nonce,
        salt, kdf: oldKdf, keyVersion: 1, recoverySalt, recoveryWrappedKey: recovery.wrapped, recoveryNonce: recovery.nonce };
    return mk;
}
beforeEach(async () => {
    await lockLocal();
    jest.clearAllMocks();
    (auth as any).currentUser = { uid: 'a', email: 'a@example.com' };
    keys = null;
    jest.mocked(getStoredMasterKey).mockResolvedValue(null);
    jest.mocked(reauthenticateWithCredential).mockResolvedValue({} as any);
    jest.mocked(apiService.getKeys).mockImplementation(async () => keys);
    jest.mocked(apiService.putKeys).mockImplementation(async next => { keys = next; return next; });
});

it('never returns another account’s cached or stored master key', async () => {
    const mk = await seedKeys();
    await unlockWithPassword('old password');
    expect(await getMasterKey()).toEqual(mk);
    const stored = jest.mocked(saveMasterKey).mock.calls[0][0];
    (auth as any).currentUser = { uid: 'b' };
    jest.mocked(getStoredMasterKey).mockResolvedValue(stored);
    expect(await getMasterKey()).toBeNull();
});

it('requires unlock for unscoped keys left by an older install', async () => {
    jest.mocked(getStoredMasterKey).mockResolvedValue(base64.encode(generateMasterKey()));
    expect(await getMasterKey()).toBeNull();
});

it('invalidates local keys after another device resets encryption', async () => {
    await seedKeys();
    await unlockWithPassword('old password');
    keys = { ...keys!, keyId: '22222222-2222-4222-8222-222222222222' };
    expect(await getMasterKey(true)).toBeNull();
});

it('keeps old recovery codes working when the password KDF is upgraded', async () => {
    const mk = await seedKeys();
    await unlockWithPassword('old password');
    await rewrapWithNewPassword('new password');
    expect(keys?.recoveryKdf).toEqual(oldKdf);
    await lockLocal();
    const replacement = await recoverWithCode('ABCDEFGHIJKLMNOPQRST', 'new password');
    expect(replacement).toBeTruthy();
    expect(await getMasterKey()).toEqual(mk);
});

it('does not delete encrypted data if reauthentication fails', async () => {
    jest.mocked(reauthenticateWithCredential).mockRejectedValueOnce(new Error('Wrong password'));
    await expect(resetEncryptedData('wrong')).rejects.toThrow('Wrong password');
    expect(apiService.deleteKeys).not.toHaveBeenCalled();
});

it('does not unlock locally when recovery key storage fails', async () => {
    await seedKeys();
    jest.mocked(apiService.putKeys).mockRejectedValueOnce(new Error('Conflict'));
    await expect(recoverWithCode('ABCDEFGHIJKLMNOPQRST', 'new password')).rejects.toThrow('Conflict');
    expect(saveMasterKey).not.toHaveBeenCalled();
    expect(await getMasterKey()).toBeNull();
});

it('does not revive a stored key when a lock overtakes its read', async () => {
    const mk = await seedKeys();
    let finishRead!: (value: string) => void;
    jest.mocked(getStoredMasterKey).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    const pending = getMasterKey();
    await Promise.resolve();
    const locked = lockLocal();
    finishRead(JSON.stringify({ uid: 'a', keyId: keys!.keyId, key: base64.encode(mk) }));
    expect(await pending).toBeNull();
    await locked;
    expect(await getMasterKey()).toBeNull();
});

it('rejects an unlock started before a lock even for the same account', async () => {
    await seedKeys();
    let finishRead!: (value: EncryptionKeys) => void;
    jest.mocked(apiService.getKeys).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    const pending = unlockWithPassword('old password');
    const rejected = expect(pending).rejects.toThrow('Account or encryption changed');
    await lockLocal();
    finishRead(keys!);
    await rejected;
    expect(saveMasterKey).not.toHaveBeenCalled();
});

it('never rewraps an old master key as the new key after a remote reset', async () => {
    await seedKeys();
    await unlockWithPassword('old password');
    jest.mocked(apiService.putKeys).mockClear();
    const nextKeys = { ...keys!, keyId: '22222222-2222-4222-8222-222222222222' };
    jest.mocked(apiService.getKeys).mockResolvedValueOnce(keys).mockResolvedValueOnce(nextKeys);
    await expect(rewrapWithNewPassword('new password')).rejects.toThrow('Encryption changed');
    expect(apiService.putKeys).not.toHaveBeenCalled();
});
