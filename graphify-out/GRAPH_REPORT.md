# Graph Report - cloudclip  (2026-10-31)

## Corpus Check
- 145 files · ~81,018 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1006 nodes · 2248 edges · 82 communities (44 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f7c31a00`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- app.ts
- keyService.ts
- ApiService
- expo
- dependencies
- devDependencies
- useDeviceDetails.ts
- isVaultFreeRoute
- RegionPicker.tsx
- app/package.json
- compilerOptions
- compilerOptions
- manifest.json
- vercel.json
- expo
- check-release.mjs
- region.js
- share-preview.js
- metro.config.js
- react-native-svg
- @zxcvbn-ts/language-en
- sw.js
- fix-html-head.mjs
- declarations.d.ts
- dependencies
- expo-crypto
- CloudClip Hosted Sites — Build Plan
- expo-font
- expo-linking
- expo-splash-screen
- expo-status-bar
- expo-system-ui
- firebase
- sitePublisher.ts
- @noble/hashes
- react
- react-dom
- react-native
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-web
- react-native-worklets
- @scure/base
- three
- @zxcvbn-ts/core
- sitesService.ts
- Design System: CloudClip
- README.md
- routes/sites.ts
- services/sites.ts
- android
- siteStorage.ts
- siteServe.ts
- deployment.md
- Product
- publisherAuth.ts
- High-level view
- SocketService
- Architecture decisions
- ios
- Google Play release checklist
- CloudClip
- extra
- platforms
- web
- Release readiness — 2026-09-08 snapshot
- Do's and Don'ts
- expo-clipboard
- expo-document-picker
- expo-router
- @expo/vector-icons
- react-native-qrcode-svg
- socket.io-client
- @zxcvbn-ts/language-common

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 67 edges
2. `useThemedStyles()` - 52 edges
3. `ApiService` - 47 edges
4. `ensureOk()` - 30 edges
5. `fetch()` - 29 edges
6. `useAuth()` - 27 edges
7. `ThemeTokens` - 27 edges
8. `useClipboardSync()` - 20 edges
9. `getMasterKey()` - 20 edges
10. `expo-router` - 19 edges

## Surprising Connections (you probably didn't know these)
- `assertEncryptionKey()` --references--> `User`  [EXTRACTED]
  backend/src/services/encryption.ts → app/service/models.ts
- `lookupActiveSite()` --references--> `PublishedSite`  [EXTRACTED]
  backend/src/routes/siteServe.ts → app/service/models.ts
- `createSiteWithDeployment()` --references--> `PublishedSite`  [EXTRACTED]
  backend/src/services/sitePublisher.ts → app/service/models.ts
- `redeploySite()` --references--> `PublishedSite`  [EXTRACTED]
  backend/src/services/sitePublisher.ts → app/service/models.ts
- `verifyPublisherKey()` --references--> `PublisherKey`  [EXTRACTED]
  backend/src/middleware/publisherAuth.ts → app/service/models.ts

## Import Cycles
- None detected.

## Communities (82 total, 38 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.05
Nodes (101): About(), makeStyles(), DeleteAccount(), makeStyles(), ThemeDocumentSync(), styles, makeStyles(), PrivacyPolicy() (+93 more)

### Community 1 - "app.ts"
Cohesion: 0.05
Nodes (56): AppBundle, createApp(), closeRedis(), connectRedis(), RedisConnections, start(), Express, getFirebaseAuth() (+48 more)

### Community 2 - "keyService.ts"
Cohesion: 0.06
Nodes (85): Account(), makeStyles(), makeStyles(), sharedId(), SharedLinks(), AuthProvider(), makeStyles(), SharedContent() (+77 more)

### Community 3 - "ApiService"
Cohesion: 0.11
Nodes (22): DecoratedShared, ClipboardScreenProps, makeStyles(), Props, DisplayClip, API_ORIGIN, ApiService, ensureOk() (+14 more)

### Community 4 - "expo"
Cohesion: 0.13
Nodes (14): typedRoutes, expo, description, experiments, icon, name, orientation, plugins (+6 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, cors, dotenv, express, express-rate-limit, fflate, firebase-admin, helmet (+23 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): author, description, devDependencies, jest, mongodb-memory-server, socket.io-client, supertest, ts-jest (+39 more)

### Community 7 - "useDeviceDetails.ts"
Cohesion: 0.42
Nodes (7): defaultDeviceName(), DeviceDetails, useDeviceDetails(), getAppDeviceId(), getDeviceId(), getDeviceOS(), getWebDeviceId()

### Community 9 - "RegionPicker.tsx"
Cohesion: 0.11
Nodes (25): RootLayout(), clientSnapshot(), Description(), makeStyles(), platforms, serverSnapshot(), subscribe(), GatewayRegionRedirect() (+17 more)

### Community 10 - "app/package.json"
Cohesion: 0.04
Nodes (45): devDependencies, @babel/core, jest, jest-expo, @react-native/jest-preset, @types/jest, @types/react, @types/three (+37 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, jsx, noUnusedLocals, noUnusedParameters, paths, strict, types, extends (+7 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+7 more)

### Community 13 - "manifest.json"
Cohesion: 0.14
Nodes (13): background_color, categories, description, display, icons, name, orientation, scope (+5 more)

### Community 14 - "vercel.json"
Cohesion: 0.18
Nodes (10): includeFiles, buildCommand, cleanUrls, devCommand, framework, functions, api/share-preview.js, headers (+2 more)

### Community 16 - "check-release.mjs"
Cohesion: 0.25
Nodes (7): eas, env, envFile, errors, links, pkg, required

### Community 17 - "region.js"
Cohesion: 0.60
Nodes (4): distanceSquared(), handler(), header(), REGION_CENTERS

### Community 27 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, expo-constants, expo-device, expo-secure-store, @noble/ciphers, expo-constants, expo-device, expo-secure-store (+1 more)

### Community 29 - "CloudClip Hosted Sites — Build Plan"
Cohesion: 0.06
Nodes (30): API, Backend configuration, CloudClip Hosted Sites, How it works, Limits & safety, Not implemented (future), Acceptance criteria, Account > Developer (+22 more)

### Community 36 - "sitePublisher.ts"
Cohesion: 0.19
Nodes (18): IPublishedSite, PublishedSiteSchema, SiteStatus, SiteVisibility, lookupActiveSite(), createSiteWithDeployment(), deploy(), PublicSite (+10 more)

### Community 53 - "sitesService.ts"
Cohesion: 0.17
Nodes (17): makeStyles(), Sites(), detectSourceType(), formatBytes(), inferType(), isSupportedUpload(), isValidSlug(), MAX_ARCHIVE_BYTES (+9 more)

### Community 54 - "Design System: CloudClip"
Cohesion: 0.13
Nodes (14): Buttons, Cards / Containers, Colors, Components, Design System: CloudClip, Elevation & Depth, Inputs / Fields, Layout (+6 more)

### Community 55 - "README.md"
Cohesion: 0.21
Nodes (5): CloudClip app, CloudClip API, Repository guide, API contract, Development

### Community 56 - "routes/sites.ts"
Cohesion: 0.17
Nodes (10): agentPublishLimiter, createKeySchema, createMetaSchema, handleSiteError(), patchSchema, publishLimiter, statusForCode(), upload (+2 more)

### Community 57 - "services/sites.ts"
Cohesion: 0.21
Nodes (12): contentTypeFor(), ExtractedSite, extractUpload(), GeneratedPublisherKey, hasNonFallbackExtension(), isSafePath(), MAX_EXTRACTED_BYTES, MAX_FILES (+4 more)

### Community 58 - "android"
Cohesion: 0.17
Nodes (12): backgroundColor, foregroundImage, adaptiveIcon, allowBackup, blockedPermissions, intentFilters, package, android (+4 more)

### Community 59 - "siteStorage.ts"
Cohesion: 0.20
Nodes (10): DeploymentSourceType, DeploymentStatus, ISiteDeployment, IStoredFile, SiteDeploymentSchema, StoredFileSchema, ExtractedFile, deploymentHasFile() (+2 more)

### Community 60 - "siteServe.ts"
Cohesion: 0.24
Nodes (9): accessCookie(), accessToken(), applyServingHeaders(), hasValidAccess(), notFound(), router, sessionSecret(), unlockLimiter (+1 more)

### Community 61 - "deployment.md"
Cohesion: 0.17
Nodes (9): Backend release, Configure, Current verification, Deployment and rollback, Operations, Hosting on IBM instead of GCP, Backend setup, Regional deployment (+1 more)

### Community 62 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 63 - "publisherAuth.ts"
Cohesion: 0.24
Nodes (9): Express, Request, verifyPublisherKey(), IPublisherKey, PublisherKeySchema, generatePublisherKey(), hashPublisherKey(), isPublisherKeyFormat() (+1 more)

### Community 64 - "High-level view"
Cohesion: 0.22
Nodes (8): Extraction DoS bounds — mostly covered, one cliff, High-level view, Hosted Sites: public static-site hosting at /s/&lt;slug&gt;, Ownership and publisher keys, Password gate — cryptographically fine, redeploy-invalidation is a nice property, Path traversal and zip-slip — sound, no escape found, Publish transaction — the rollback and swap ordering, Same-origin serving via Vercel rewrite — the isolation claim is false

### Community 66 - "Architecture decisions"
Cohesion: 0.25
Nodes (8): Architecture decisions, Components, Deferred work, Deployment and scaling, Encryption contract, Identity and concurrency, Product scope, Write and sync contract

### Community 67 - "ios"
Cohesion: 0.33
Nodes (6): ios, associatedDomains, bundleIdentifier, supportsTablet, applinks:in.cclip.cc, applinks:us.cclip.cc

### Community 68 - "Google Play release checklist"
Cohesion: 0.33
Nodes (6): Assets, Build and device gates, Console requirements, Google Play release checklist, Listing draft, Submit

### Community 69 - "CloudClip"
Cohesion: 0.33
Nodes (6): Architecture and release, Build an installable Android APK, CloudClip, How the regional deployment works, Run locally, Verify

### Community 70 - "extra"
Cohesion: 0.40
Nodes (5): projectId, extra, eas, router, origin

### Community 71 - "platforms"
Cohesion: 0.50
Nodes (4): platforms, android, ios, web

### Community 72 - "web"
Cohesion: 0.50
Nodes (4): web, bundler, favicon, output

### Community 73 - "Release readiness — 2026-09-08 snapshot"
Cohesion: 0.50
Nodes (4): Important fixes and cleanup, Release blockers requiring owner input or external validation, Release readiness — 2026-09-08 snapshot, Verified locally

### Community 74 - "Do's and Don'ts"
Cohesion: 0.67
Nodes (3): Do:, Do's and Don'ts, Don't:

## Knowledge Gaps
- **385 isolated node(s):** `REGION_CENTERS`, `fs`, `path`, `name`, `slug` (+380 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `app/package.json`, `expo`, `react-native-svg`, `@zxcvbn-ts/language-en`, `expo-crypto`, `expo-font`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `firebase`, `@noble/hashes`, `react`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-web`, `react-native-worklets`, `@scure/base`, `three`, `@zxcvbn-ts/core`, `expo-clipboard`, `expo-document-picker`, `expo-router`, `@expo/vector-icons`, `react-native-qrcode-svg`, `socket.io-client`, `@zxcvbn-ts/language-common`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `RecoveryCodeModal()` connect `useTheme` to `react`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `useTheme`, `dependencies`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **What connects `REGION_CENTERS`, `fs`, `path` to the rest of the system?**
  _385 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.05347189418989136 - nodes in this community are weakly interconnected._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05042016806722689 - nodes in this community are weakly interconnected._
- **Should `keyService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05750224618149147 - nodes in this community are weakly interconnected._