import {
    DEFAULT_KDF,
    DecryptionError,
    generateMasterKey,
    generateSaltB64,
    deriveKek,
    wrapBytes,
    unwrapBytes,
    encryptEntry,
    decryptEntry,
    isEnvelope,
    hashText,
    generateShareToken,
    shareCodeFromToken,
    deriveShareKey,
    formatShareToken,
    normalizeShareToken,
    isValidShareToken,
    generateRecoveryCode,
    formatRecoveryCode,
    normalizeRecoveryCode,
} from '../cryptoService';

describe('entry encryption', () => {
    const mk = generateMasterKey();

    it('round-trips plaintext through an envelope', () => {
        const envelope = encryptEntry(mk, 'hello clipboard 📋');
        expect(isEnvelope(envelope)).toBe(true);
        expect(envelope).not.toContain('hello');
        expect(decryptEntry(mk, envelope)).toBe('hello clipboard 📋');
    });

    it('produces a fresh nonce per encryption', () => {
        const a = JSON.parse(encryptEntry(mk, 'same'));
        const b = JSON.parse(encryptEntry(mk, 'same'));
        expect(a.n).not.toBe(b.n);
        expect(a.ct).not.toBe(b.ct);
    });

    it('throws DecryptionError with the wrong key', () => {
        const envelope = encryptEntry(mk, 'secret');
        expect(() => decryptEntry(generateMasterKey(), envelope)).toThrow(DecryptionError);
    });

    it('throws DecryptionError on garbage and unknown algorithms', () => {
        expect(() => decryptEntry(mk, 'not json at all')).toThrow(DecryptionError);
        expect(() => decryptEntry(mk, JSON.stringify({ v: 1, alg: 'XCHACHA', n: 'AA==', ct: 'AA==' })))
            .toThrow(DecryptionError);
    });

    it('isEnvelope distinguishes legacy plaintext', () => {
        expect(isEnvelope('plain old clipboard text')).toBe(false);
        expect(isEnvelope('{"some":"json"}')).toBe(false);
        expect(isEnvelope(encryptEntry(mk, 'x'))).toBe(true);
    });
});

describe('key wrapping (password + recovery)', () => {
    // Small N keeps the test fast; production params live in DEFAULT_KDF.
    const TEST_KDF = { ...DEFAULT_KDF, N: 1024 };

    it('wraps and unwraps the master key with a password-derived KEK', async () => {
        const mk = generateMasterKey();
        const salt = generateSaltB64();
        const kek = await deriveKek('correct horse battery', salt, TEST_KDF);
        const { wrapped, nonce } = wrapBytes(kek, mk);

        const kekAgain = await deriveKek('correct horse battery', salt, TEST_KDF);
        expect(unwrapBytes(kekAgain, wrapped, nonce)).toEqual(mk);
    });

    it('wrong password fails the GCM auth tag', async () => {
        const mk = generateMasterKey();
        const salt = generateSaltB64();
        const kek = await deriveKek('right password', salt, TEST_KDF);
        const { wrapped, nonce } = wrapBytes(kek, mk);

        const wrongKek = await deriveKek('wrong password', salt, TEST_KDF);
        expect(() => unwrapBytes(wrongKek, wrapped, nonce)).toThrow(DecryptionError);
    });

    it('recovery-code wrap is independent of the password wrap', async () => {
        const mk = generateMasterKey();
        const recovery = generateRecoveryCode();
        const salt = generateSaltB64();
        const recoveryKek = await deriveKek(recovery, salt, TEST_KDF);
        const { wrapped, nonce } = wrapBytes(recoveryKek, mk);

        // Normalized re-entry of the formatted code still unlocks
        const typed = formatRecoveryCode(recovery).toLowerCase();
        const kekFromTyped = await deriveKek(normalizeRecoveryCode(typed), salt, TEST_KDF);
        expect(unwrapBytes(kekFromTyped, wrapped, nonce)).toEqual(mk);
    });
});

describe('share tokens', () => {
    it('generates valid 20-char base58 tokens', () => {
        const token = generateShareToken();
        expect(token).toHaveLength(20);
        expect(isValidShareToken(token)).toBe(true);
        // base58: no 0, O, I, l
        expect(token).not.toMatch(/[0OIl]/);
    });

    it('code is the first 8 chars; key derivation is deterministic on the full token', () => {
        const token = generateShareToken();
        expect(shareCodeFromToken(token)).toBe(token.slice(0, 8));
        expect(deriveShareKey(token)).toEqual(deriveShareKey(token));
        // A different tail (same code) must yield a different key — the server
        // code alone cannot decrypt.
        const sibling = token.slice(0, 8) + generateShareToken().slice(8);
        expect(deriveShareKey(sibling)).not.toEqual(deriveShareKey(token));
    });

    it('share encryption round-trips via the derived key', () => {
        const token = generateShareToken();
        const envelope = encryptEntry(deriveShareKey(token), 'shared text');
        expect(decryptEntry(deriveShareKey(token), envelope)).toBe('shared text');
    });

    it('format/normalize are inverse', () => {
        const token = generateShareToken();
        const pretty = formatShareToken(token);
        expect(pretty).toMatch(/^.{5}-.{5}-.{5}-.{5}$/);
        expect(normalizeShareToken(pretty)).toBe(token);
        expect(normalizeShareToken(`  ${pretty} `)).toBe(token);
    });

    it('rejects malformed tokens', () => {
        expect(isValidShareToken('short')).toBe(false);
        expect(isValidShareToken('0'.repeat(20))).toBe(false); // 0 not in base58
    });
});

describe('recovery codes', () => {
    it('generates 20-char base32 codes and formats in groups of 4', () => {
        const code = generateRecoveryCode();
        expect(code).toHaveLength(20);
        expect(code).toMatch(/^[A-Z2-7]{20}$/);
        expect(formatRecoveryCode(code)).toMatch(/^([A-Z2-7]{4}-){4}[A-Z2-7]{4}$/);
    });

    it('normalize strips separators and fixes case', () => {
        expect(normalizeRecoveryCode('abcd-efgh ijkl')).toBe('ABCDEFGHIJKL');
        expect(normalizeRecoveryCode('AB!CD 12')).toBe('ABCD2'); // 1 not in base32
    });
});

describe('hashText', () => {
    it('is deterministic and collision-visible', () => {
        expect(hashText('a')).toBe(hashText('a'));
        expect(hashText('a')).not.toBe(hashText('b'));
        expect(hashText('a')).toMatch(/^[0-9a-f]{64}$/);
    });
});
