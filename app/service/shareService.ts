import { apiService, ApiError } from './apiService';
import { Shared } from './models';
import { getWebUrl } from './util';
import { getMasterKeyId } from './keyService';
import {
    decryptEntry,
    deriveShareKey,
    encryptEntry,
    generateShareToken,
    isEnvelope,
    isValidShareToken,
    normalizeShareToken,
    shareCodeFromToken,
    unwrapBytes,
    utf8ToBytes,
    bytesToUtf8,
    wrapBytes,
} from './cryptoService';

export const SHARE_EXPIRY_OPTIONS = [
    { minutes: 10, label: '10 min' },
    { minutes: 60, label: '1 hour' },
    { minutes: 24 * 60, label: '24 hours' },
    { minutes: 7 * 24 * 60, label: '7 days' },
] as const;

export const ACCOUNT_SHARE_EXPIRY_OPTIONS = [
    ...SHARE_EXPIRY_OPTIONS,
    { minutes: 30 * 24 * 60, label: '30 days' },
] as const;

export const expiryLabel = (minutes: number): string =>
    ACCOUNT_SHARE_EXPIRY_OPTIONS.find(option => option.minutes === minutes)?.label ?? `${minutes} minutes`;

export interface ShareResult {
    token: string;
    url: string;
    displayCode: string;
    shared: Shared;
}

export interface AnonymousShareResult {
    token: string;
    url: string;
    displayCode: string;
    expiryAt?: string;
}

/** New links expose only the short code. Legacy links retain their token fragment. */
export const getSharedLinkURL = (token: string): string => {
    const code = shareCodeFromToken(token);
    return code.length === 4 ? `${getWebUrl()}/s/${code}` : `${getWebUrl()}/shared#${token}`;
};

export const isShareCode = (value: string): boolean => /^[A-Z0-9]{4}$/.test(value);

/** Accept a four-character code, a new short URL, or an older token-bearing URL. */
export const shareCredentialFromInput = (input: string | null | undefined): string => {
    const value = input?.trim() ?? '';
    if (!value) return '';
    const direct = normalizeShareToken(value.toUpperCase());
    if (isShareCode(direct)) return direct;
    const fragment = normalizeShareToken(tokenFromFragment(value));
    if (isValidShareToken(fragment)) return fragment;
    const match = value.match(/\/s\/([A-Z0-9]{4})(?:[/?#]|$)/i);
    if (match) return match[1].toUpperCase();
    const token = normalizeShareToken(value);
    return isValidShareToken(token) ? token : '';
};

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
    ttlMinutes = 7 * 24 * 60,
    clipboardId?: string
): Promise<ShareResult> => {
    // Four-character references can collide, so retry with a fresh token.
    for (let attempt = 0; attempt < 8; attempt++) {
        const token = generateShareToken();
        const shareKey = deriveShareKey(token);
        const content = encryptEntry(shareKey, plaintext);
        // Wrap the full token with the owner's MK so their own devices can
        // rebuild the link/code later.
        const ownerWrap = wrapBytes(masterKey, utf8ToBytes(token));
        try {
            const shared = await apiService.createSharedLink({
                keyId: getMasterKeyId(masterKey),
                content,
                code: shareCodeFromToken(token),
                token,
                ownerWrappedKey: ownerWrap.wrapped,
                ownerWrapNonce: ownerWrap.nonce,
                ttlMinutes,
                clipboardId,
            });
            return {
                token,
                url: getSharedLinkURL(token),
                displayCode: shareCodeFromToken(token),
                shared,
            };
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) continue;
            throw error;
        }
    }
    throw new Error('Failed to create shared link, please try again');
};

/** Create a client-encrypted share without an account or owner metadata. */
export const createAnonymousShare = async (plaintext: string, ttlMinutes = 24 * 60): Promise<AnonymousShareResult> => {
    for (let attempt = 0; attempt < 8; attempt++) {
        const token = generateShareToken();
        const content = encryptEntry(deriveShareKey(token), plaintext);
        try {
            const shared = await apiService.createAnonymousSharedLink({
                content,
                code: shareCodeFromToken(token),
                token,
                ttlMinutes,
            });
            return {
                token,
                url: getSharedLinkURL(token),
                displayCode: shareCodeFromToken(token),
                expiryAt: shared.expiryAt,
            };
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) continue;
            throw error;
        }
    }
    throw new Error('Could not create a unique shared link; try again');
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
