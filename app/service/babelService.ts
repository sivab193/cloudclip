import { getWebUrl } from './util';

export const BABEL_PAGE_SIZE = 3200;
export const BABEL_ALPHABET = 'abcdefghijklmnopqrstuvwxyz ,.';

export interface BabelAddress {
    hex: string;
    wall: number;
    shelf: number;
    volume: number;
    page: number;
}

export interface BabelLocation extends BabelAddress {
    offset: number;
    length: number;
}

const DIGITS = BABEL_ALPHABET.length;
const HEX_PATTERN = /^[0-9a-f]+$/;

export const isBabelEligible = (text: unknown): text is string => (
    typeof text === 'string'
    && text.length > 0
    && text.length <= BABEL_PAGE_SIZE
    && text.trim().length > 0
    && /^[a-z ,.]+$/.test(text)
);

const encodePage = (page: string): string => {
    let value = 0n;
    for (const character of page) value = value * BigInt(DIGITS) + BigInt(BABEL_ALPHABET.indexOf(character));
    return value.toString(16);
};

const decodePage = (hex: string): string => {
    if (!HEX_PATTERN.test(hex)) throw new Error('Invalid hexagon');
    let value = BigInt(`0x${hex}`);
    const characters = new Array<string>(BABEL_PAGE_SIZE).fill('a');
    for (let index = BABEL_PAGE_SIZE - 1; index >= 0 && value > 0n; index--) {
        const digit = Number(value % BigInt(DIGITS));
        characters[index] = BABEL_ALPHABET[digit];
        value /= BigInt(DIGITS);
    }
    if (value > 0n) throw new Error('Hexagon is outside the v1 library');
    return characters.join('');
};

/** CloudClip v1's deterministic enumeration of Babel's complete page space. */
export const pageText = (address: BabelAddress): string => {
    validateAddress(address);
    return decodePage(address.hex);
};

export const findText = (text: string): BabelLocation => {
    if (!isBabelEligible(text)) throw new Error('Text is not representable in the Library of Babel');
    const offset = Math.floor((BABEL_PAGE_SIZE - text.length) / 2);
    const page = `${'a'.repeat(offset)}${text}${'a'.repeat(BABEL_PAGE_SIZE - offset - text.length)}`;
    return { hex: encodePage(page), wall: 1, shelf: 1, volume: 1, page: 1, offset, length: text.length };
};

export const validateAddress = (address: BabelAddress): void => {
    if (!HEX_PATTERN.test(address.hex) || address.hex.length > 3890) throw new Error('Invalid hexagon');
    if (!Number.isInteger(address.wall) || address.wall < 1 || address.wall > 4) throw new Error('Invalid wall');
    if (!Number.isInteger(address.shelf) || address.shelf < 1 || address.shelf > 5) throw new Error('Invalid shelf');
    if (!Number.isInteger(address.volume) || address.volume < 1 || address.volume > 32) throw new Error('Invalid volume');
    if (!Number.isInteger(address.page) || address.page < 1 || address.page > 410) throw new Error('Invalid page');
};

export const eternalLink = (location: BabelLocation): string => {
    validateLocation(location);
    return `${getWebUrl()}/b/v1/${location.hex}/${location.wall}/${location.shelf}/${location.volume}/${location.page}/${location.offset}/${location.length}`;
};

export const parseBabelSegments = (segments: string[]): BabelLocation => {
    if (segments.length !== 7) throw new Error('Wrong number of address parts');
    const [hex, ...numbers] = segments;
    if (!numbers.every(part => /^\d+$/.test(part))) throw new Error('Invalid address number');
    const [wall, shelf, volume, page, offset, length] = numbers.map(Number);
    const location = { hex, wall, shelf, volume, page, offset, length };
    validateLocation(location);
    return location;
};

export const validateLocation = (location: BabelLocation): void => {
    validateAddress(location);
    if (!Number.isInteger(location.offset) || location.offset < 0 || location.offset >= BABEL_PAGE_SIZE) throw new Error('Invalid offset');
    if (!Number.isInteger(location.length) || location.length < 1 || location.offset + location.length > BABEL_PAGE_SIZE) throw new Error('Invalid length');
};

export const extractText = (location: BabelLocation): string => pageText(location).slice(location.offset, location.offset + location.length);
