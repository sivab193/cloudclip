import { getSharedLinkURL, shareCredentialFromInput, tokenFromFragment } from '../shareService';
jest.mock('../keyService', () => ({ getMasterKeyId: () => null }));

// shareService pulls in apiService (and through it Firebase) at import time;
// these tests only exercise the pure URL helpers.
jest.mock('../apiService', () => ({
    apiService: {},
    ApiError: class ApiError extends Error { },
}));

jest.mock('../util', () => ({
    getWebUrl: () => 'https://us.cclip.cc',
}));

describe('getSharedLinkURL', () => {
    it('creates a short URL containing only the four-character code', () => {
        const token = `A7K20${'1'.repeat(27)}`;
        const url = getSharedLinkURL(token);
        expect(url).toBe('https://us.cclip.cc/s/A7K2');
        expect(url).not.toContain(token);
    });
});

describe('shareCredentialFromInput', () => {
    it('accepts a code or short URL', () => {
        expect(shareCredentialFromInput('a7k2')).toBe('A7K2');
        expect(shareCredentialFromInput('https://us.cclip.cc/s/a7k2')).toBe('A7K2');
    });

    it('keeps a valid legacy token', () => {
        const token = `A7K20${'1'.repeat(27)}`;
        expect(shareCredentialFromInput(`https://us.cclip.cc/shared#${token}`)).toBe(token);
    });
});

describe('tokenFromFragment', () => {
    it('reads a bare fragment', () => {
        expect(tokenFromFragment('#TOKEN123')).toBe('TOKEN123');
        expect(tokenFromFragment('https://us.cclip.cc/shared#TOKEN123')).toBe('TOKEN123');
    });

    it('reads a key=value fragment', () => {
        expect(tokenFromFragment('https://us.cclip.cc/shared#token=TOKEN123')).toBe('TOKEN123');
    });

    it('handles native deep links', () => {
        expect(tokenFromFragment('cloudclip://shared#TOKEN123')).toBe('TOKEN123');
    });

    it('returns empty when there is no fragment', () => {
        expect(tokenFromFragment('https://us.cclip.cc/shared')).toBe('');
        expect(tokenFromFragment('https://us.cclip.cc/shared#')).toBe('');
        expect(tokenFromFragment(null)).toBe('');
        expect(tokenFromFragment(undefined)).toBe('');
    });
});
