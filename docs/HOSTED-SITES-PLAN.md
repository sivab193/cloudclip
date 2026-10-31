# CloudClip Hosted Sites — Build Plan

## Purpose

Add **Hosted Sites** as a first-class CloudClip capability. A signed-in user can upload either a single HTML file or a ZIP containing a finished static website build, then receive a durable URL where CloudClip serves that site.

The user-facing action is **Host a site**. Do not call it generic file sharing, and do not describe ZIP files as apps: ZIP is merely the delivery format for a static website build.

## Required reference implementation

**Use the Artifact Foundry repository as the implementation reference before writing this feature.** It already represents the desired publishing workflow: HTML/ZIP intake, durable URL assignment, optional password access, R2-backed static assets, and agent-oriented publishing.

1. Locate or obtain the Artifact Foundry source repository (the product currently runs at `https://af.siv19.dev/`).
2. Read its upload validation, archive extraction, R2/object-key layout, serving Worker, password gate, publisher-key handling, and any MCP/API publishing code.
3. Reuse proven behavior and safety controls where they fit.
4. Do **not** copy Artifact Foundry's standalone branding or product structure. The new work belongs inside CloudClip's account, region, auth, design system, API, and deployment model.
5. Treat this document as the CloudClip-specific contract whenever it conflicts with Artifact Foundry.

## Product contract

### V1 supports

- Signed-in CloudClip users only.
- One `.html` file or one `.zip` static-site build per deployment.
- A ZIP must contain a root-level `index.html`.
- Durable URLs in the form `https://<slug>.sites.cclip.cc`.
- Public or password-protected access.
- Redeployment without changing the site URL.
- Site list, deployment state, copy URL, delete, and publisher-key management.
- Publishing through a scoped agent/API publisher key.

### V1 does not support

- General file transfer or encrypted private files.
- Server-side code, server functions, databases, forms processing, or build execution.
- Anonymous publishing, Git integration, custom domains, analytics, team workspaces, preview URLs, redirects, or UI rollback.
- Any claim that password protection is end-to-end encryption.

### Keep the two CloudClip jobs separate

| Capability | Content | Access | Lifetime | Outcome |
| --- | --- | --- | --- | --- |
| Share | Text and later private files | Encrypted / expiring | Temporary | Recipient receives content |
| Hosted Sites | HTML or static site build | Public or password-gated | Durable | Browser renders the site |

## Architecture

Keep the existing Expo application, Node API, Firebase Auth, MongoDB, Redis, and region model. Add a small static-hosting plane.

```text
CloudClip app -- Firebase bearer token --> Node API
                                            |
                                            +-- MongoDB: site/deployment/key metadata
                                            +-- R2: immutable extracted website files
                                            +-- Cloudflare API: publish serving manifests

Visitor --> <slug>.sites.cclip.cc --> Sites Worker --> R2
                                          |
                                          +-- Node API only to verify a password unlock
```

- Add a dedicated `sites.cclip.cc` hostname and a Sites Worker. Never serve customer-provided HTML from the main CloudClip application origin.
- Keep the R2 bucket private. The Worker is the only serving path, so it can enforce password access and safe routing.
- Use immutable object prefixes per deployment: `sites/<site-id>/<deployment-id>/...`.
- Publish a deployment atomically by updating one small serving manifest only after every object has uploaded successfully.
- Begin as a **US-only Sites beta**. Store US hosted content in a US-jurisdiction bucket. Do not make Sites available in another CloudClip region until its storage and serving policy is explicitly implemented.

## Models and indexes

Create `PublishedSite`:

```ts
{
  _id,
  ownerId,                    // Firebase UID
  slug,                       // globally unique, lowercase, immutable in V1
  displayName,
  visibility: 'public' | 'password',
  passwordHash: string | null, // Argon2id; never return it
  region: 'us',
  status: 'active' | 'processing' | 'failed' | 'deleted',
  activeDeploymentId,
  createdAt,
  updatedAt,
  deletedAt: Date | null
}
```

Create `SiteDeployment`:

```ts
{
  _id,
  siteId,
  ownerId,
  version,
  sourceFilename,
  sourceType: 'html' | 'zip',
  sourceBytes,
  extractedBytes,
  fileCount,
  objectPrefix,
  entryPath: 'index.html',
  status: 'processing' | 'ready' | 'failed',
  errorCode: string | null,
  errorMessage: string | null, // safe to show the owner
  createdAt
}
```

Create `PublisherKey` either separately or under the user model:

```ts
{
  _id,
  ownerId,
  label,
  keyPrefix,
  keyHash,                    // raw key is returned once only
  scopes: ['sites:publish'],
  lastUsedAt,
  revokedAt,
  createdAt
}
```

Required indexes:

- Unique, case-insensitive `PublishedSite.slug`.
- `{ ownerId, updatedAt: -1 }` for owner dashboards.
- Unique `{ siteId, version }`.
- Publisher-key lookup by `keyPrefix` and `revokedAt`.

## API

Add `backend/src/routes/sites.ts` and `backend/src/services/sites.ts`.

Authenticated owner routes:

```text
GET    /sites
POST   /sites                     multipart: source, slug, displayName, visibility, password?
GET    /sites/:id
PATCH  /sites/:id                 update display name, visibility, or password
POST   /sites/:id/deployments     multipart redeploy
GET    /sites/:id/deployments
DELETE /sites/:id                 revoke serving first; asynchronously clean objects

GET    /publisher-keys
POST   /publisher-keys            reveal raw key exactly once
DELETE /publisher-keys/:id
```

Agent route:

```text
POST /sites/publish
Authorization: Bearer cc_pub_<secret>
Content-Type: multipart/form-data

source=<html-or-zip>
slug=<optional>
displayName=<optional>
visibility=public|password
password=<optional>
```

Return the site ID, slug, durable URL, deployment ID, and terminal status. Use stable errors such as `slug_taken`, `invalid_archive`, `missing_index`, `archive_limit`, `publisher_key_revoked`, `site_limit`, and `region_unavailable`.

## Archive validation and deploy transaction

1. Validate the selected file on the client for immediate feedback.
2. Authenticate on the Node API; never trust browser validation.
3. Validate and extract server-side.
4. Upload every extracted object to a new immutable R2 prefix.
5. Write/update `manifests/<slug>.json` only after the entire deployment passes.
6. Mark the deployment active in MongoDB.
7. Return the durable URL.

If any part fails before the manifest swap, the prior live deployment remains untouched.

V1 safety limits:

- 25 MB compressed archive maximum.
- 100 MB extracted content maximum.
- 2,000 files maximum.
- Reject encrypted archives, symlinks, absolute paths, `..` traversal, duplicate normalized paths, `.git`, `.env`, invalid names, and suspicious compression ratios.
- Require a root `index.html`.
- Preserve regular files only.
- Determine content type from a strict extension mapping; serve unknown extensions as `application/octet-stream`.

## Sites Worker contract

Routes:

```text
https://<slug>.sites.cclip.cc/
https://<slug>.sites.cclip.cc/assets/app-abc.js
https://<slug>.sites.cclip.cc/pricing
https://<slug>.sites.cclip.cc/_cloudclip/unlock
```

Behavior:

- Resolve the slug from the hostname, never from a user-controlled object path.
- Read the slug manifest; return 404 when missing, deleted, or disabled.
- Serve an exact existing object first.
- If a path has no extension and requests HTML, fall back to `index.html` to support SPA builds.
- Never fall back for missing JS, CSS, image, font, or sourcemap files.
- Send exact MIME types and `X-Content-Type-Options: nosniff`.
- Cache hashed assets aggressively and HTML conservatively.
- Keep CloudClip auth cookies host-only; no CloudClip account auth state may be available on `sites.cclip.cc`.
- For password-protected sites, show a minimal access page. Submit the password to a narrow Node unlock endpoint, verify it against the Argon2id hash, and issue a short-lived signed host-only cookie.
- Rate-limit password attempts and protect the unlock endpoint with WAF rules.

## CloudClip UI

Add a signed-in fourth tab:

```text
Home | Shared | Sites | Account
```

### Sites empty state

- Title: **Host a finished site.**
- Copy: **Upload an HTML file or ZIP build. CloudClip gives it a durable link.**
- Primary action: **Choose HTML or ZIP**.
- Secondary action: **Publish from an agent**.
- Disclosure: **Hosted sites are public unless you add a password.**

### Publish flow

1. Choose an HTML or ZIP file.
2. Show file name, size, and detected type.
3. Enter a URL slug and preview the final hostname.
4. Pick Public or Password protected.
5. Publish with explicit states: validating, uploading, publishing, live, failed.
6. On success, show Open site, Copy link, and Deploy another version.

### Dashboard card

- Display name and hostname.
- Public/Password protected badge.
- Last deployment time, size, and file count.
- Open, Copy link, Redeploy, Settings, Delete.
- Do not iframe arbitrary hosted HTML inside the authenticated CloudClip UI; always open the isolated site hostname.

### Account > Developer

- Publisher keys list.
- Create a labeled key and show it only once.
- Copy a configuration snippet for agents.
- Show last-used time and revoke action.

Suggested code layout:

```text
app/app/(tabs)/sites.tsx
app/components/SitePublisher.tsx
app/components/SiteDeploymentList.tsx
app/components/SiteSettingsModal.tsx
app/components/PublisherKeyPanel.tsx
app/service/sitesService.ts

backend/src/models/PublishedSite.ts
backend/src/models/SiteDeployment.ts
backend/src/routes/sites.ts
backend/src/services/sites.ts

site-edge/                       # standalone Worker project
```

## Agent and MCP support

Phase 1 is the HTTP publisher-key endpoint above. Keep Artifact Foundry's agent-friendly workflow as the functional reference.

Phase 2 adds an MCP adapter with:

```text
publish_artifact
list_sites
get_site
delete_site
```

The MCP layer must call the same CloudClip API and must not bypass validation, ownership, limits, audits, or publisher-key revocation.

## Security, limits, and operations

Before public rollout, implement:

- Per-account site-count and storage quotas.
- Separate rate limits for account publishing, publisher-key publishing, and password attempts.
- Reserved slug list: `www`, `api`, `app`, `admin`, `sites`, `status`, `support`, `help`, and `docs`.
- Audit events for publish, redeploy, password changes, key creation/revocation, and deletion.
- Serving revocation before object deletion.
- Monitoring for deploy failures, Worker failures, 404 rates, password failures, storage, and bandwidth.
- MongoDB metadata backups and documented R2 retention/cleanup behavior.

## Acceptance criteria

- A signed-in user can publish a single `index.html` and receive a working durable URL.
- A Vite/React ZIP build with hashed assets and SPA routes renders correctly.
- Relative assets, nested assets, CSS, fonts, and client-side routes work.
- Password-protected sites deny content before unlock and work after a correct password.
- Incorrect password attempts are rate limited.
- Redeploying preserves the hostname and never exposes a partial upload.
- A failed archive leaves the prior deployment serving normally.
- Deleting a site produces a 404 before object cleanup begins.
- Revoking a publisher key prevents future API publishing immediately.
- User-provided site JavaScript cannot access CloudClip authentication state.
- App typecheck/tests, backend tests, Worker tests, and browser E2E publishing tests pass.

## Delivery sequence

1. Inspect Artifact Foundry and document the reusable publishing behavior.
2. Provision the isolated hostname, private R2 bucket, Worker skeleton, and US-only feature flag.
3. Implement models, archive validation, immutable R2 deployment, and atomic manifest publishing.
4. Implement Worker asset serving, MIME headers, SPA fallback, and deletion revocation.
5. Implement owner API and CloudClip Sites dashboard.
6. Implement password protection and publisher-key lifecycle.
7. Add agent HTTP publishing, then an MCP adapter.
8. Add quotas, WAF/rate limits, monitoring, tests, and operator documentation.
9. Decide the Artifact Foundry migration separately: retain `af.siv19.dev` until every existing artifact is copied, checksummed, and verified before redirecting it.
