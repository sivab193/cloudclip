import * as Crypto from 'expo-crypto';

// Hermes has no WebCrypto; @noble/* needs crypto.getRandomValues.
// Must be imported before anything that touches the crypto libs.
if (typeof globalThis.crypto === 'undefined') {
    (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.getRandomValues === 'undefined') {
    (globalThis.crypto as any).getRandomValues = (array: Uint8Array) => Crypto.getRandomValues(array);
}
