import express from 'express';
import rateLimit from 'express-rate-limit';
import { createHmac, timingSafeEqual } from 'crypto';
import PublishedSite from '../models/PublishedSite';
import {
  isValidSlug,
  isSafePath,
  hasNonFallbackExtension,
  verifyPassword,
} from '../services/sites';
import { readDeploymentFile, deploymentHasFile } from '../services/siteStorage';

const router = express.Router();

// Host-only cookie name per site. Kept narrow so unlocking one site never
// grants access to another, and never collides with CloudClip app cookies.
const accessCookie = (slug: string) => `ccsite_access_${slug}`;

// Require a dedicated secret for site access cookies. We intentionally do NOT
// fall back to FIREBASE_PRIVATE_KEY (coupling unrelated trust domains); if the
// secret is unset the gate fails closed and password sites return 503.
const sessionSecret = (): string => process.env.SITES_SESSION_SECRET || '';

const accessToken = (slug: string, deploymentId: string): string =>
  createHmac('sha256', sessionSecret()).update(`${slug}:${deploymentId}`).digest('base64url');

const hasValidAccess = (req: express.Request, slug: string, deploymentId: string): boolean => {
  if (!sessionSecret()) return false;
  const raw = req.headers.cookie
    ?.split(';')
    .map(p => p.trim())
    .find(p => p.startsWith(`${accessCookie(slug)}=`))
    ?.split('=')[1];
  if (!raw) return false;
  const expected = accessToken(slug, deploymentId);
  const a = Buffer.from(raw);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Strict headers for every served object. Hosted sites share the app's path
// space (/s/<slug>), so without an origin boundary we rely on a SANDBOX CSP to
// isolate user content: `Content-Security-Policy: sandbox ...` forces the
// document into a unique, opaque origin, so its scripts cannot read the
// CloudClip app's cookies, localStorage, sessionStorage, or make credentialed
// same-origin requests — even though the bytes are served from the app host.
// This is the primary isolation control; nosniff and setting no CloudClip
// cookies are defense-in-depth. (Moving to a dedicated host later makes the
// sandbox pure defense-in-depth; no code change required.)
const SANDBOX_CSP = 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads';

const applyServingHeaders = (res: express.Response, contentType: string, cacheControl: string, sandbox = false): void => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', cacheControl);
  if (sandbox) {
    // Applied to any response the browser may treat as a document (HTML/SVG).
    res.setHeader('Content-Security-Policy', SANDBOX_CSP);
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
  // No CloudClip credentials are ever set on these responses.
};

// A served file is "document-like" (can execute script in the page's origin) if
// it is HTML or SVG; those must carry the sandbox CSP.
const isDocumentLike = (contentType: string): boolean =>
  contentType.startsWith('text/html') || contentType.startsWith('image/svg+xml');

const notFound = (res: express.Response) => {
  res.status(404);
  applyServingHeaders(res, 'text/html; charset=utf-8', 'no-store', true);
  res.send('<!doctype html><meta charset="utf-8"><title>404</title><body style="font-family:system-ui;padding:40px"><h1>404</h1><p>This site or page was not found.</p>');
};

const lockedPage = (slug: string, next: string, incorrect = false): string => {
  const msg = incorrect ? 'That password did not match. Try again.' : 'This site is protected by its publisher.';
  const safeNext = next.replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Protected site</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#e8eefc;font-family:system-ui,Arial,sans-serif}main{width:min(420px,calc(100% - 48px));border:1px solid #27324a;border-radius:16px;padding:32px;background:#121a2b}h1{font-size:20px;margin:0 0 6px}p{line-height:1.5;color:#9fb0cc}label{display:block;margin-top:22px;font:700 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#9fb0cc}input{box-sizing:border-box;width:100%;margin-top:8px;padding:12px;border:1px solid #27324a;border-radius:10px;background:#0b1220;color:#e8eefc;font:16px system-ui}button{width:100%;margin-top:20px;padding:13px;border:0;border-radius:10px;background:#3b82f6;color:#fff;font-weight:700;letter-spacing:.03em;cursor:pointer}.err{color:#f87171}</style></head><body><main><div style="font-size:12px;font-weight:bold;letter-spacing:.12em;color:#3b82f6">CLOUDCLIP · SITES</div><h1>Enter password</h1><p class="${incorrect ? 'err' : ''}">${msg}</p><form method="post" action="/s/${encodeURIComponent(slug)}/_cloudclip/unlock"><input type="hidden" name="next" value="${safeNext}"><label>Password<input name="password" required type="password" autofocus></label><button>Open site →</button></form></main></body></html>`;
};

const lookupActiveSite = async (slug: string) => {
  if (!isValidSlug(slug)) return null;
  return PublishedSite.findOne({ slug, status: 'active' })
    .collation({ locale: 'en', strength: 2 })
    .select('+passwordHash +passwordSalt');
};

// Rate-limit password attempts per IP.
const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Password unlock endpoint (form POST from the locked page).
router.post('/:slug/_cloudclip/unlock', unlockLimiter, express.urlencoded({ extended: false, limit: '4kb' }), async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    const site = await lookupActiveSite(slug);
    if (!site || site.visibility !== 'password' || !site.passwordHash || !site.passwordSalt || !site.activeDeploymentId) {
      return notFound(res);
    }
    const supplied = String((req.body as any)?.password ?? '');
    const nextPath = typeof (req.body as any)?.next === 'string' ? (req.body as any).next : `/s/${slug}/`;
    const safeNext = nextPath.startsWith(`/s/${slug}/`) ? nextPath : `/s/${slug}/`;

    if (!verifyPassword(supplied, site.passwordSalt, site.passwordHash)) {
      applyServingHeaders(res, 'text/html; charset=utf-8', 'no-store', true);
      return res.status(401).send(lockedPage(slug, safeNext, true));
    }
    if (!sessionSecret()) {
      return res.status(503).json({ error: 'Site access is not configured' });
    }
    const token = accessToken(slug, String(site.activeDeploymentId));
    res.setHeader('Set-Cookie', `${accessCookie(slug)}=${token}; Path=/s/${slug}/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
    res.redirect(303, safeNext);
  } catch (error) {
    next(error);
  }
});

// Public asset serving: GET /s/:slug and /s/:slug/<path...>
router.get('/:slug{/*rest}', async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    const site = await lookupActiveSite(slug);
    if (!site || !site.activeDeploymentId) return notFound(res);

    const deploymentId = String(site.activeDeploymentId);

    // The named wildcard arrives as an array of path segments (or undefined).
    const restParam = (req.params as any).rest;
    const restPath = Array.isArray(restParam) ? restParam.join('/') : (restParam ? String(restParam) : '');

    if (site.visibility === 'password' && !hasValidAccess(req, slug, deploymentId)) {
      applyServingHeaders(res, 'text/html; charset=utf-8', 'no-store', true);
      const requested = `/s/${slug}/${restPath}`;
      return res.status(401).send(lockedPage(slug, requested));
    }

    let target = restPath ? decodeURIComponent(restPath) : 'index.html';

    // Directory-style request → its index.html.
    if (target === '' || target.endsWith('/')) target = `${target}index.html`;
    if (!isSafePath(target)) return notFound(res);

    // 1) Exact file.
    let file = await readDeploymentFile(deploymentId, target);

    // 2) SPA fallback: only for extensionless / HTML navigations, never for
    //    missing JS/CSS/images/fonts/sourcemaps.
    if (!file && !hasNonFallbackExtension(target)) {
      file = await readDeploymentFile(deploymentId, 'index.html');
    }
    if (!file) return notFound(res);

    const isHtml = file.contentType.startsWith('text/html');
    const cache = isHtml
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=31536000, immutable';
    // Sandbox any document-like content (HTML, SVG) so user scripts run in an
    // opaque origin and cannot reach CloudClip's auth state.
    applyServingHeaders(res, file.contentType, cache, isDocumentLike(file.contentType));
    res.status(200).send(file.body);
  } catch (error) {
    next(error);
  }
});

export default router;
