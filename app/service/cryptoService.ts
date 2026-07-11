import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { randomBytes, utf8ToBytes, bytesToHex } from '@noble/hashes/utils.js';
import { bytesToUtf8 } from '@noble/ciphers/utils.js';
import { base64 } from '@scure/base';

/**
 * End-to-end encryption core. Pure functions only — no storage, no network —
 * so everything here is unit-testable.
 *
 * Scheme:
 * - Each user has a random 256-bit master key (MK). Clipboard entries are
 *   AES-256-GCM encrypted with the MK into a JSON "envelope" string that the
 *   server stores opaquely.
 * - The MK itself is stored server-side only in wrapped form: encrypted with
 *   a KEK derived (scrypt) from the account password, and separately with a
 *   KEK derived from a one-time recovery code.
 * - Share links use a 20-char token: the first 8 chars are the server lookup
 *   code; the decryption key is HKDF-derived from the FULL token, which never
 *   reaches the server.
 */

export interface KdfParams {
    name: 'scrypt';
    N: number;
    r: number;
    p: number;
}

// ~32 MB scrypt memory; runs only at login/key-setup. Params are stored
// server-side per user, so they can be raised later without a migration.
export const DEFAULT_KDF: KdfParams = { name: 'scrypt', N: 32768, r: 8, p: 1 };

/** Thrown when a GCM auth tag fails — wrong password/key or corrupt data. */
export class DecryptionError extends Error {
    constructor(message = 'Decryption failed') {
        super(message);
        this.name = 'DecryptionError';
    }
}

export interface WrappedKey {
    wrapped: string; // base64
    nonce: string;   // base64
}

interface Envelope {
    v: number;
    alg: string;
    n: string;
    ct: string;
}

const NONCE_LENGTH = 12;

export const generateMasterKey = (): Uint8Array => randomBytes(32);

export const generateSaltB64 = (): string => base64.encode(randomBytes(16));

export const deriveKek = async (secret: string, saltB64: string, kdf: KdfParams): Promise<Uint8Array> => {
    return scryptAsync(secret.normalize('NFKC'), base64.decode(saltB64), {
        N: kdf.N,
        r: kdf.r,
        p: kdf.p,
        dkLen: 32,
    });
};

export const wrapBytes = (key: Uint8Array, data: Uint8Array): WrappedKey => {
    const nonce = randomBytes(NONCE_LENGTH);
    const wrapped = gcm(key, nonce).encrypt(data);
    return { wrapped: base64.encode(wrapped), nonce: base64.encode(nonce) };
};

export const unwrapBytes = (key: Uint8Array, wrappedB64: string, nonceB64: string): Uint8Array => {
    try {
        return gcm(key, base64.decode(nonceB64)).decrypt(base64.decode(wrappedB64));
    } catch {
        throw new DecryptionError();
    }
};

export const encryptEntry = (key: Uint8Array, plaintext: string): string => {
    const nonce = randomBytes(NONCE_LENGTH);
    const ct = gcm(key, nonce).encrypt(utf8ToBytes(plaintext));
    const envelope: Envelope = { v: 1, alg: 'A256GCM', n: base64.encode(nonce), ct: base64.encode(ct) };
    return JSON.stringify(envelope);
};

export const decryptEntry = (key: Uint8Array, envelopeStr: string): string => {
    let envelope: Envelope;
    try {
        envelope = JSON.parse(envelopeStr);
    } catch {
        throw new DecryptionError('Not an encrypted envelope');
    }
    if (envelope.alg !== 'A256GCM') {
        throw new DecryptionError(`Unsupported algorithm: ${envelope.alg}`);
    }
    try {
        const plain = gcm(key, base64.decode(envelope.n)).decrypt(base64.decode(envelope.ct));
        return bytesToUtf8(plain);
    } catch {
        throw new DecryptionError();
    }
};

/** True if the string looks like one of our ciphertext envelopes (vs legacy plaintext). */
export const isEnvelope = (content: string): boolean => {
    if (!content.startsWith('{')) return false;
    try {
        const parsed = JSON.parse(content);
        return parsed?.v === 1 && typeof parsed?.ct === 'string' && typeof parsed?.n === 'string';
    } catch {
        return false;
    }
};

export const hashText = (text: string): string => bytesToHex(sha256(utf8ToBytes(text)));

// --- random strings over custom alphabets (rejection sampling, unbiased) ---

const randomFromAlphabet = (alphabet: string, length: number): string => {
    const max = Math.floor(256 / alphabet.length) * alphabet.length;
    let out = '';
    while (out.length < length) {
        const bytes = randomBytes(length * 2);
        for (const b of bytes) {
            if (b < max) {
                out += alphabet[b % alphabet.length];
                if (out.length === length) break;
            }
        }
    }
    return out;
};

// --- share tokens ---

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SHARE_TOKEN_LENGTH = 20;
const SHARE_CODE_LENGTH = 8;

export const generateShareToken = (): string => randomFromAlphabet(BASE58, SHARE_TOKEN_LENGTH);

/** The server-side lookup code: possession of it alone yields only ciphertext. */
export const shareCodeFromToken = (token: string): string => token.slice(0, SHARE_CODE_LENGTH);

export const deriveShareKey = (token: string): Uint8Array =>
    hkdf(sha256, utf8ToBytes(token), undefined, utf8ToBytes('cloudclip-share-v1'), 32);

export const formatShareToken = (token: string): string =>
    token.match(/.{1,5}/g)?.join('-') ?? token;

export const normalizeShareToken = (input: string): string => input.replace(/[\s-]/g, '');

export const isValidShareToken = (token: string): boolean =>
    token.length === SHARE_TOKEN_LENGTH && [...token].every(c => BASE58.includes(c));

// --- recovery codes ---

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const RECOVERY_CODE_LENGTH = 20; // 100 bits

export const generateRecoveryCode = (): string => randomFromAlphabet(BASE32, RECOVERY_CODE_LENGTH);

export const formatRecoveryCode = (code: string): string =>
    code.match(/.{1,4}/g)?.join('-') ?? code;

export const normalizeRecoveryCode = (input: string): string =>
    input.toUpperCase().replace(/[^A-Z2-7]/g, '');

export { utf8ToBytes, bytesToUtf8 };
export { base64 };
