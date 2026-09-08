import User from '../models/User';

export class EncryptionChangedError extends Error {
  constructor() { super('Encryption changed on another device. Unlock your data and try again.'); }
}

/** Called inside the same per-user lock as resets and the ensuing write. */
export async function assertEncryptionKey(userId: string, keyId: string | null | undefined) {
  // Older installed clients omit this field; new clients explicitly send null
  // for legacy keys, or the UUID of their current encryption key.
  if (keyId === undefined) return;
  const user = await User.findOne({ firebaseUid: userId }).select('encryption');
  if (!user?.encryption?.wrappedKey || (user.encryption.keyId ?? null) !== keyId) {
    throw new EncryptionChangedError();
  }
}
