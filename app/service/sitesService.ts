import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getWebUrl } from './util';

// Mirror of the backend limits (services/sites.ts) for immediate client-side
// feedback. The server re-validates everything — browser checks are a courtesy.
export const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;

export const SITE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const RESERVED_SLUGS = new Set([
    'www', 'api', 'app', 'admin', 'sites', 'site', 'status', 'support',
    'help', 'docs', 'about', 'privacy', 'terms', 'shared', 'share',
    'account', 'login', 'logout', 'signin', 'signup', 'unlock', 's', 'f', 't',
]);

export interface PickedFile {
    // On web this is a real File/Blob; on native we pass the {uri,name,type}
    // shape that fetch/FormData understands.
    source: Blob | { uri: string; name: string; type: string };
    name: string;
    size: number;
    type: string;
}

/** Normalize user input toward a valid slug (lowercase, hyphenated). */
export const normalizeSlug = (input: string): string =>
    input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63);

export const isValidSlug = (slug: string): boolean => SITE_SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);

export const slugError = (slug: string): string | null => {
    if (!slug) return null;
    if (RESERVED_SLUGS.has(slug)) return 'That slug is reserved.';
    if (!SITE_SLUG_RE.test(slug)) return 'Use 2-63 lowercase letters, numbers, and single hyphens.';
    return null;
};

/** The durable URL a slug will resolve to, for live preview. */
export const previewSiteUrl = (slug: string): string => `${getWebUrl()}/s/${slug || '<slug>'}`;

export const isSupportedUpload = (name: string): boolean => /\.(html?|zip)$/i.test(name);

export const detectSourceType = (name: string): 'html' | 'zip' | 'unknown' => {
    if (/\.zip$/i.test(name)) return 'zip';
    if (/\.html?$/i.test(name)) return 'html';
    return 'unknown';
};

export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * Pick an HTML or ZIP file. Returns null if the user cancels.
 * Throws with a friendly message for unsupported/oversized files.
 */
export const pickSiteFile = async (): Promise<PickedFile | null> => {
    const result = await DocumentPicker.getDocumentAsync({
        type: ['text/html', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
        copyToCacheDirectory: true,
        multiple: false,
    });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    const name = asset.name ?? 'upload';

    if (!isSupportedUpload(name)) {
        throw new Error('Choose a single .html file or a .zip site build.');
    }
    const size = asset.size ?? 0;
    if (size > MAX_ARCHIVE_BYTES) {
        throw new Error(`Uploads are limited to ${Math.round(MAX_ARCHIVE_BYTES / 1024 / 1024)} MB.`);
    }

    // Web exposes a real File; native exposes a file:// uri.
    if (Platform.OS === 'web') {
        const file = (asset as any).file as File | undefined;
        if (file) {
            return { source: file, name, size: file.size, type: file.type || inferType(name) };
        }
        // Fallback: fetch the blob from the returned uri.
        const blob = await (await fetch(asset.uri)).blob();
        return { source: blob, name, size: blob.size, type: blob.type || inferType(name) };
    }
    return {
        source: { uri: asset.uri, name, type: asset.mimeType || inferType(name) },
        name,
        size,
        type: asset.mimeType || inferType(name),
    };
};

const inferType = (name: string): string =>
    /\.zip$/i.test(name) ? 'application/zip' : 'text/html';

/** Agent config snippet shown in the Developer panel for a publisher key. */
export const publisherKeySnippet = (apiOrigin: string, rawKey: string): string =>
    [
        '# Publish a static site to CloudClip from an agent or CLI:',
        `curl -X POST ${apiOrigin}/api/sites/publish \\`,
        `  -H "Authorization: Bearer ${rawKey}" \\`,
        '  -F "source=@./dist.zip" \\',
        '  -F "slug=my-site"',
    ].join('\n');
