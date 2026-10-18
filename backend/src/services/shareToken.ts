import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const VERSION = 1;

const encryptionKey = (): Buffer => {
  const source = process.env.SHARE_TOKEN_ENCRYPTION_KEY || process.env.FIREBASE_PRIVATE_KEY;
  if (!source) throw new Error('Share token encryption is not configured');
  return createHash('sha256')
    .update('cloudclip-share-token-v1\0')
    .update(source)
    .digest();
};

export const sealShareToken = (token: string): string => {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), nonce, tag, ciphertext]).toString('base64url');
};

export const openShareToken = (wrapped: string): string => {
  const payload = Buffer.from(wrapped, 'base64url');
  if (payload.length < 30 || payload[0] !== VERSION) throw new Error('Unsupported share token envelope');
  const nonce = payload.subarray(1, 13);
  const tag = payload.subarray(13, 29);
  const ciphertext = payload.subarray(29);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};
