import { unzipSync } from 'fflate';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// ── Limits (from HOSTED-SITES-PLAN.md, bounded by Mongo's 16MB BSON cap) ──────
// A deployment is stored as a single MongoDB document with base64-encoded
// files. Base64 inflates by ~33%, so a 9 MB extracted build encodes to ~12 MB,
// leaving headroom under the 16 MB BSON document cap. Moving file bytes to
// object storage (via services/siteStorage.ts) would lift this ceiling.
export const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;   // 10 MB compressed upload
export const MAX_EXTRACTED_BYTES = 9 * 1024 * 1024;  // 9 MB total extracted
export const MAX_FILES = 2000;

// Slugs reserved for CloudClip's own routes/brand — never publishable.
export const RESERVED_SLUGS = new Set([
  'www', 'api', 'app', 'admin', 'sites', 'site', 'status', 'support',
  'help', 'docs', 'about', 'privacy', 'terms', 'shared', 'share',
  'account', 'login', 'logout', 'signin', 'signup', 'unlock', 's', 'f', 't',
]);

export class SiteError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SiteError';
    this.code = code;
  }
}

// ── Slug + path validation (adapted from Artifact Foundry) ───────────────────
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const isValidSlug = (value: string): boolean => SLUG_RE.test(value);

export const assertPublishableSlug = (value: string): void => {
  if (!isValidSlug(value)) {
    throw new SiteError('invalid_slug', 'Slugs use lowercase letters, numbers, and single hyphens (2-63 chars).');
  }
  if (RESERVED_SLUGS.has(value)) {
    throw new SiteError('slug_reserved', 'That slug is reserved by CloudClip.');
  }
};

// A path is safe when it is relative, has no empty/".", ".." segments, and no
// leading slash or backslash. Rejects traversal, absolute paths, and Windows
// separators that could normalize unexpectedly.
export const isSafePath = (value: string): boolean => {
  if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0')) return false;
  const parts = value.split('/');
  return !parts.some(part => !part || part === '.' || part === '..');
};

// ── MIME mapping (strict; unknown => octet-stream) ───────────────────────────
const MIME_MAP: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  wasm: 'application/wasm',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml',
  webmanifest: 'application/manifest+json',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
};

export const contentTypeFor = (path: string): string =>
  MIME_MAP[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

// Extensions that must resolve to a real file — never SPA-fallback to
// index.html. Falling back here would serve HTML under a JS/CSS content type
// (blocked by nosniff) and mask genuinely-missing assets.
const NON_FALLBACK_EXT = new Set([
  'js', 'mjs', 'css', 'json', 'map', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'avif', 'svg', 'ico', 'bmp', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'wasm',
  'mp4', 'webm', 'mp3', 'ogg', 'pdf',
]);

export const hasNonFallbackExtension = (path: string): boolean =>
  NON_FALLBACK_EXT.has(path.split('.').pop()?.toLowerCase() ?? '');

// ── Extraction ───────────────────────────────────────────────────────────────
export interface ExtractedFile {
  path: string;
  contentType: string;
  bytes: number;
  data: string; // base64
}

export interface ExtractedSite {
  sourceType: 'html' | 'zip';
  entryPath: 'index.html';
  files: ExtractedFile[];
  extractedBytes: number;
  fileCount: number;
}

const toStored = (path: string, contents: Uint8Array): ExtractedFile => ({
  path,
  contentType: contentTypeFor(path),
  bytes: contents.byteLength,
  data: Buffer.from(contents).toString('base64'),
});

/**
 * Validate and extract an uploaded HTML file or ZIP static-site build into the
 * set of files to store. Throws SiteError with a stable code on any violation.
 */
export const extractUpload = (filename: string, buffer: Buffer): ExtractedSite => {
  if (!filename || buffer.byteLength === 0) {
    throw new SiteError('empty_upload', 'A non-empty .html or .zip file is required.');
  }
  if (buffer.byteLength > MAX_ARCHIVE_BYTES) {
    throw new SiteError('archive_limit', `Uploads are limited to ${Math.round(MAX_ARCHIVE_BYTES / 1024 / 1024)} MB.`);
  }

  const isZip = /\.zip$/i.test(filename);
  const isHtml = /\.html?$/i.test(filename);
  if (!isZip && !isHtml) {
    throw new SiteError('unsupported_type', 'Only .html, .htm, and .zip files are supported.');
  }

  // Single HTML file → one index.html.
  if (!isZip) {
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength > MAX_EXTRACTED_BYTES) {
      throw new SiteError('archive_limit', 'The HTML file is too large.');
    }
    return {
      sourceType: 'html',
      entryPath: 'index.html',
      files: [toStored('index.html', bytes)],
      extractedBytes: bytes.byteLength,
      fileCount: 1,
    };
  }

  // ZIP build.
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new SiteError('invalid_archive', 'That ZIP could not be read. Re-export the build and try again.');
  }

  // Keep real files only (fflate yields directory entries ending in "/").
  const entries = Object.entries(archive).filter(([path]) => !path.endsWith('/'));
  if (entries.length === 0) {
    throw new SiteError('invalid_archive', 'The ZIP is empty.');
  }
  if (entries.length > MAX_FILES) {
    throw new SiteError('archive_limit', `A build may contain at most ${MAX_FILES} files.`);
  }

  // Reject unsafe paths: traversal, absolute, backslashes, dotfiles we never host.
  for (const [path] of entries) {
    if (!isSafePath(path)) {
      throw new SiteError('invalid_archive', `Unsafe path in archive: ${path}`);
    }
    const lower = path.toLowerCase();
    const top = lower.split('/')[0];
    const base = lower.split('/').pop() ?? '';
    if (top === '.git' || base === '.env' || base.startsWith('.env.') || top === '__macosx') {
      throw new SiteError('invalid_archive', `Disallowed file in archive: ${path}`);
    }
  }

  const totalBytes = entries.reduce((sum, [, contents]) => sum + contents.byteLength, 0);
  if (totalBytes > MAX_EXTRACTED_BYTES) {
    throw new SiteError('archive_limit', `The unpacked build is limited to ${Math.round(MAX_EXTRACTED_BYTES / 1024 / 1024)} MB.`);
  }
  // Suspicious compression ratio (zip bomb guard).
  if (buffer.byteLength > 0 && totalBytes / buffer.byteLength > 200) {
    throw new SiteError('invalid_archive', 'The archive has a suspicious compression ratio.');
  }

  // Locate index.html: at root, or inside a single top-level folder.
  let prefix = '';
  if (archive['index.html']) {
    prefix = '';
  } else {
    const roots = [...new Set(entries.map(([path]) => path.split('/')[0]))];
    if (roots.length === 1 && archive[`${roots[0]}/index.html`]) {
      prefix = `${roots[0]}/`;
    } else {
      throw new SiteError('missing_index', 'A ZIP build must contain index.html at its root or in a single top-level folder.');
    }
  }

  const files: ExtractedFile[] = [];
  const seen = new Set<string>();
  for (const [path, contents] of entries) {
    if (prefix && !path.startsWith(prefix)) continue;
    const relative = prefix ? path.slice(prefix.length) : path;
    if (!relative) continue;
    const normalized = relative.toLowerCase();
    if (seen.has(normalized)) {
      throw new SiteError('invalid_archive', `Duplicate path after normalization: ${relative}`);
    }
    seen.add(normalized);
    files.push(toStored(relative, contents));
  }

  if (!files.some(f => f.path === 'index.html')) {
    throw new SiteError('missing_index', 'The build must contain a root index.html.');
  }

  return {
    sourceType: 'zip',
    entryPath: 'index.html',
    files,
    extractedBytes: totalBytes,
    fileCount: files.length,
  };
};

// ── Password hashing (scrypt; argon2 is not a backend dependency) ────────────
export const hashPassword = (password: string): { hash: string; salt: string } => {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, 32).toString('base64url');
  return { hash, salt };
};

export const verifyPassword = (password: string, salt: string, expectedHash: string): boolean => {
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(expectedHash, 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

// ── Publisher keys ────────────────────────────────────────────────────────────
const KEY_PREFIX = 'cc_pub_';

export interface GeneratedPublisherKey {
  raw: string;      // shown to the owner exactly once
  keyPrefix: string;
  keyHash: string;
}

export const generatePublisherKey = (): GeneratedPublisherKey => {
  const secret = randomBytes(24).toString('base64url');
  const raw = `${KEY_PREFIX}${secret}`;
  return {
    raw,
    keyPrefix: raw.slice(0, 14), // cc_pub_ + 7 chars, enough to index + display
    keyHash: hashPublisherKey(raw),
  };
};

export const hashPublisherKey = (raw: string): string =>
  createHash('sha256').update(`cloudclip-publisher-key-v1\0`).update(raw).digest('base64url');

export const publisherKeyPrefix = (raw: string): string => raw.slice(0, 14);

export const isPublisherKeyFormat = (raw: string): boolean =>
  raw.startsWith(KEY_PREFIX) && raw.length >= 20 && raw.length <= 64;
