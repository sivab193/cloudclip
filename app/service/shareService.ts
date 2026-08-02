import { apiService, ApiError } from './apiService';
import { Shared } from './models';
import { getWebUrl } from './util';
import {
    decryptEntry,
    deriveShareKey,
    encryptEntry,
    formatShareToken,
    generateShareToken,
    isEnvelope,
    shareCodeFromToken,
    unwrapBytes,
    utf8ToBytes,
    bytesToUtf8,
    wrapBytes,
} from './cryptoService';

/**
 * E2E shared links. One 20-char token does everything:
 * - first 8 chars = server lookup code (yields only ciphertext by itself),
 * - the decryption key is derived from the FULL token, which the server never
 *   receives.
 * "Copy link" and "copy code" are two renderings of the same token, backed by
 * ONE server object.
 */

export interface ShareResult {
    token: string;
    url: string;
    displayCode: string;
    shared: Shared;
}

/**
 * The token is the decryption key, so it goes in the URL *fragment*: browsers
 * never send fragments to the server, keeping it out of hosting/CDN access
 * logs and out of Referer headers. Only the 8-char lookup prefix is ever sent,
 * and that alone yields nothing but ciphertext.
 */
export const getSharedLinkURL = (token: string): string => `${getWebUrl()}/shared#${token}`;

/**
 * Pull the share token out of a URL fragment. Accepts both the bare form
 * (`/shared#TOKEN`) and a key=value form (`/shared#token=TOKEN`).
 */
export const tokenFromFragment = (url: string | null | undefined): string => {
    if (!url) return '';
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return '';
    const fragment = url.slice(hashIndex + 1);
    if (!fragment) return '';
    const keyed = new URLSearchParams(fragment).get('token');
    return (keyed ?? fragment).trim();
};

export const createShare = async (
    plaintext: string,
    masterKey: Uint8Array,
    ttlDays = 7,
    clipboardId?: string
): Promise<ShareResult> => {
    // Retry on the (unlikely) 8-char code collision with a fresh token.
    for (let attempt = 0; attempt < 3; attempt++) {
        const token = generateShareToken();
        const shareKey = deriveShareKey(token);
        const content = encryptEntry(shareKey, plaintext);
        // Wrap the full token with the owner's MK so their own devices can
        // rebuild the link/code later.
        const ownerWrap = wrapBytes(masterKey, utf8ToBytes(token));
        try {
            const shared = await apiService.createSharedLink({
                content,
                code: shareCodeFromToken(token),
                ownerWrappedKey: ownerWrap.wrapped,
                ownerWrapNonce: ownerWrap.nonce,
                ttlDays,
                clipboardId,
            });
            return {
                token,
                url: getSharedLinkURL(token),
                displayCode: formatShareToken(token),
                shared,
            };
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) continue;
            throw error;
        }
    }
    throw new Error('Failed to create shared link, please try again');
};

/** Recover the full share token for a link the current user owns. */
export const tokenFromShared = (shared: Shared, masterKey: Uint8Array): string | null => {
    if (!shared.ownerWrappedKey || !shared.ownerWrapNonce) return null;
    try {
        return bytesToUtf8(unwrapBytes(masterKey, shared.ownerWrappedKey, shared.ownerWrapNonce));
    } catch {
        return null;
    }
};

/** Decrypt fetched shared content with the token; passes legacy plaintext through. */
export const decryptSharedContent = (token: string, content: string): string => {
    if (!isEnvelope(content)) return content;
    return decryptEntry(deriveShareKey(token), content);
};
