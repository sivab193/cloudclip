# CloudClip Hosted Sites

Host a finished static site — a single HTML file or a ZIP build — and get a
durable, public URL that anyone can open with no account.

- **Publishers** sign in (or use a publisher key) to upload and manage sites.
- **Visitors** need no login. Sites are public unless the owner sets a password.

This document describes the shipped implementation. The original design is in
[HOSTED-SITES-PLAN.md](./HOSTED-SITES-PLAN.md); where this file differs, the
differences and their rationale are called out below.

## URL scheme

Path-based on the main domain (no per-site subdomains):

| Path | Purpose |
| --- | --- |
| `cclip.cc/s/<slug>` | Hosted **sites** (this feature) |
| `cclip.cc/t/<code>` | **Text** share short links (moved here from `/s/`) |
| `cclip.cc/f/...` | Reserved for future **file** transfer |

> **Breaking change:** text share links moved from `/s/<code>` to
> `/t/<code>`. Pasting an old `/s/<code>` link into the "open a shared link"
> box still resolves (the parser accepts both), but newly minted links use
> `/t/`. This was an explicit product decision to give `/s/` to Sites.

## How it works

```
Publisher app ──Firebase bearer──▶ Node API (/api/sites)
                                     │
                                     ├─ MongoDB: PublishedSite / SiteDeployment / PublisherKey
                                     └─ deployment files stored in the SiteDeployment doc (base64)

Visitor ──▶ cclip.cc/s/<slug> ──(Vercel rewrite)──▶ Node API (/s/<slug>/*) ──▶ MongoDB
```

- The web app is on Vercel; `vercel.json` rewrites `/s/:path*` to the backend
  origin (`https://api-us.cclip.cc/s/:path*`) and excludes `/s/` from the app's
  CSP/X-Frame headers so user HTML renders. The backend sets its own
  `nosniff` + no-credential headers on served responses.
- **Storage.** The plan specifies R2 with per-deployment object prefixes. This
  implementation stores deployment files inside the `SiteDeployment` MongoDB
  document (base64) to avoid new infrastructure. All storage access goes through
  `backend/src/services/siteStorage.ts`, which is the single seam to move bytes
  to R2/S3 later without touching routes or metadata. Because a deployment is
  one Mongo document (16 MB BSON cap), the archive/extracted limits are smaller
  than the plan's (see Limits).
- **Serving isolation.** The plan mandates a separate hostname + Worker. This
  implementation serves from a dedicated path (`/s`) on the API origin and
  isolates user content with a **sandbox CSP**: every HTML/SVG response carries
  `Content-Security-Policy: sandbox allow-scripts allow-forms allow-popups …`,
  which forces the document into a unique opaque origin. User scripts therefore
  cannot read CloudClip cookies, `localStorage`, `sessionStorage`, or make
  credentialed same-origin requests, even though the bytes are served from the
  app host. `nosniff` and never setting CloudClip cookies are defense-in-depth.
  Moving to a dedicated cookieless host later makes the sandbox pure
  defense-in-depth and is a deployment change, not a code change.

## API

Owner routes (Firebase bearer token):

```
GET    /api/sites                     list your sites
POST   /api/sites                     multipart: source, slug?, displayName?, visibility?, password?
GET    /api/sites/:id
PATCH  /api/sites/:id                 displayName | visibility | password
POST   /api/sites/:id/deployments     multipart redeploy (same URL)
GET    /api/sites/:id/deployments
DELETE /api/sites/:id                 revokes serving immediately, cleans objects after

GET    /api/sites/keys/list
POST   /api/sites/keys                reveals the raw key once
DELETE /api/sites/keys/:id            revoke
```

Agent route (publisher key):

```
POST /api/sites/publish
Authorization: Bearer cc_pub_<secret>
Content-Type: multipart/form-data
source=<html-or-zip>  slug=<optional>  displayName=<optional>  visibility=public|password  password=<optional>
```

Public serving (no auth):

```
GET  /s/:slug                         entry (index.html)
GET  /s/:slug/<path...>               exact asset, else SPA fallback to index.html
POST /s/:slug/_cloudclip/unlock       password form → host-only access cookie
```

Stable error codes: `slug_taken`, `slug_reserved`, `invalid_slug`,
`invalid_archive`, `missing_index`, `archive_limit`, `unsupported_type`,
`site_limit`, `password_required`.

## Limits & safety

- 10 MB max upload, 9 MB max extracted, 2,000 files max.
- ZIP must contain `index.html` at root or in one top-level folder.
- Rejects path traversal, absolute paths, backslashes, `.git`, `.env`,
  `__MACOSX`, duplicate normalized paths, and suspicious compression ratios.
- Strict extension→MIME map; unknown extensions serve as
  `application/octet-stream`. Missing JS/CSS/image/font/sourcemap never falls
  back to HTML.
- Passwords hashed with scrypt + per-site salt (never returned). Access cookies
  are host-only HMACs scoped to `/s/<slug>/` and bound to the active deployment
  id, so a redeploy invalidates old access cookies. `SITES_SESSION_SECRET` is
  required for password sites; if unset they fail closed (503). Unlock attempts
  are rate limited (20 / 15 min per IP); publishing is rate limited per account
  and per key.
- Reserved slugs: `www, api, app, admin, sites, site, status, support, help,
  docs, about, privacy, terms, shared, share, account, login, logout, signin,
  signup, unlock, s, f, t`.
- Max 25 sites per account.

## Backend configuration

Add to the backend `.env` (see `.env.example`):

```
SITES_PUBLIC_ORIGIN=https://cclip.cc     # builds https://<origin>/s/<slug>
SITES_SESSION_SECRET=<openssl rand -base64 32>   # signs password cookies
```

If `SITES_SESSION_SECRET` is unset it falls back to
`SHARE_TOKEN_ENCRYPTION_KEY`, then `FIREBASE_PRIVATE_KEY`.

## Publishing from an agent

Create a publisher key in the app (Sites tab → "Publish from an agent"), then:

```sh
curl -X POST https://api-us.cclip.cc/api/sites/publish \
  -H "Authorization: Bearer cc_pub_xxx" \
  -F "source=@./dist.zip" \
  -F "slug=my-site"
```

An MCP adapter (`publish_artifact`, `list_sites`, `get_site`, `delete_site`) is
a planned Phase 2 that will call these same endpoints.

## Not implemented (future)

- R2/S3 storage backend (seam ready in `siteStorage.ts`).
- Dedicated cookieless serving subdomain.
- Git-link → build → deploy pipeline (next planned capability: provide a repo
  URL, CloudClip builds it and hosts the output).
- MCP adapter, custom domains, analytics, multi-region.

## Where the code lives

```
backend/src/models/PublishedSite.ts     SiteDeployment.ts     PublisherKey.ts
backend/src/services/sites.ts           validation + extraction + hashing
backend/src/services/sitePublisher.ts   publish/redeploy transaction
backend/src/services/siteStorage.ts     storage seam (Mongo today, R2 later)
backend/src/middleware/publisherAuth.ts publisher-key auth
backend/src/routes/sites.ts             owner + agent API
backend/src/routes/siteServe.ts         public /s serving + password gate
backend/src/routes/__tests__/sites.test.ts

app/app/(tabs)/sites.tsx                 Sites tab (publish flow + dashboard)
app/components/SiteSettingsModal.tsx
app/components/PublisherKeyPanel.tsx
app/service/sitesService.ts              client validation + file picker
app/service/apiService.ts                site + publisher-key methods
```
