import { getSharedLinkURL, tokenFromFragment } from '../shareService';

// shareService pulls in apiService (and through it Firebase) at import time;
// these tests only exercise the pure URL helpers.
jest.mock('../apiService', () => ({
    apiService: {},
    ApiError: class ApiError extends Error { },
}));

jest.mock('../util', () => ({
    getWebUrl: () => 'https://cc.siv19.dev',
}));

describe('getSharedLinkURL', () => {
    it('puts the token in the fragment, not the path', () => {
        const url = getSharedLinkURL('abc123XYZ456def789J');
        expect(url).toBe('https://cc.siv19.dev/shared#abc123XYZ456def789J');
        // The part sent to the server must not contain the token.
        const [beforeHash] = url.split('#');
        expect(beforeHash).toBe('https://cc.siv19.dev/shared');
        expect(beforeHash).not.toContain('abc123XYZ456def789J');
    });
});

describe('tokenFromFragment', () => {
    it('reads a bare fragment', () => {
        expect(tokenFromFragment('#TOKEN123')).toBe('TOKEN123');
        expect(tokenFromFragment('https://cc.siv19.dev/shared#TOKEN123')).toBe('TOKEN123');
    });

    it('reads a key=value fragment', () => {
        expect(tokenFromFragment('https://cc.siv19.dev/shared#token=TOKEN123')).toBe('TOKEN123');
    });

    it('handles native deep links', () => {
        expect(tokenFromFragment('cloudclip://shared#TOKEN123')).toBe('TOKEN123');
    });

    it('returns empty when there is no fragment', () => {
        expect(tokenFromFragment('https://cc.siv19.dev/shared')).toBe('');
        expect(tokenFromFragment('https://cc.siv19.dev/shared#')).toBe('');
        expect(tokenFromFragment(null)).toBe('');
        expect(tokenFromFragment(undefined)).toBe('');
    });
});
