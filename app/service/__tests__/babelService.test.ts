import { BABEL_ALPHABET, BABEL_PAGE_SIZE, eternalLink, extractText, findText, isBabelEligible, parseBabelSegments } from '../babelService';

describe('babelService', () => {
    test.each(['hello, world.', 'a', ' '.repeat(3199) + 'a', 'a'.repeat(BABEL_PAGE_SIZE)])('accepts Babel text', text => {
        expect(isBabelEligible(text)).toBe(true);
    });

    test.each(['', '   ', 'Hello', 'hello!', 'hello\n', '🪄', 'a'.repeat(BABEL_PAGE_SIZE + 1)])('rejects non-Babel text', text => {
        expect(isBabelEligible(text)).toBe(false);
    });

    test('round trips deterministic locations and links', () => {
        let seed = 42;
        for (let sample = 0; sample < 40; sample++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const length = 1 + (seed % 100);
            let text = '';
            for (let index = 0; index < length; index++) {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                text += BABEL_ALPHABET[seed % BABEL_ALPHABET.length];
            }
            if (!text.trim()) text = `a${text.slice(1)}`;
            const location = findText(text);
            expect(findText(text)).toEqual(location);
            expect(extractText(location)).toBe(text);
            const segments = eternalLink(location).split('/b/v1/')[1].split('/');
            expect(parseBabelSegments(segments)).toEqual(location);
        }
    });

    test('rejects malformed or out-of-range links', () => {
        expect(() => parseBabelSegments(['abc', '5', '1', '1', '1', '0', '2'])).toThrow();
        expect(() => parseBabelSegments(['abc', '1', '1', '1', '1', '3199', '2'])).toThrow();
        expect(() => parseBabelSegments(['not-hex', '1', '1', '1', '1', '0', '2'])).toThrow();
    });
});
