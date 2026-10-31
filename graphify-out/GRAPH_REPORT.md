# Graph Report - .  (2026-10-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 737 nodes · 1747 edges · 53 communities (24 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `31846633`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useTheme
- shared.ts
- sharedLinks.tsx
- ApiService
- expo
- backend/package.json
- devDependencies
- useClipboardSync.ts
- keyService.ts
- RegionPicker.tsx
- app/package.json
- compilerOptions
- compilerOptions
- manifest.json
- vercel.json
- dependencies
- check-release.mjs
- region.js
- share-preview.js
- metro.config.js
- react-native-qrcode-svg
- @zxcvbn-ts/language-common
- sw.js
- fix-html-head.mjs
- declarations.d.ts
- expo-constants
- expo-crypto
- expo-device
- expo-font
- expo-linking
- expo-splash-screen
- expo-status-bar
- expo-system-ui
- firebase
- @noble/ciphers
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

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 61 edges
2. `useThemedStyles()` - 46 edges
3. `ApiService` - 32 edges
4. `useAuth()` - 25 edges
5. `ThemeTokens` - 24 edges
6. `useClipboardSync()` - 20 edges
7. `fetch()` - 20 edges
8. `ensureOk()` - 20 edges
9. `getMasterKey()` - 20 edges
10. `SharedLinks()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `RegionPicker()` --indirect_call--> `state()`  [INFERRED]
  app/components/RegionPicker.tsx → app/service/__tests__/syncEngine.test.ts
- `useClipboardSync()` --indirect_call--> `clip()`  [INFERRED]
  app/hooks/useClipboardSync.ts → app/hooks/__tests__/useClipboardSync.test.tsx
- `connectDB()` --references--> `User`  [EXTRACTED]
  backend/src/config/db.ts → app/service/models.ts
- `assertEncryptionKey()` --references--> `User`  [EXTRACTED]
  backend/src/services/encryption.ts → app/service/models.ts
- `connectDB()` --references--> `Device`  [EXTRACTED]
  backend/src/config/db.ts → app/service/models.ts

## Import Cycles
- None detected.

## Communities (53 total, 29 thin omitted)

### Community 0 - "useTheme"
Cohesion: 0.06
Nodes (82): About(), makeStyles(), DeleteAccount(), makeStyles(), ThemeDocumentSync(), styles, makeStyles(), PrivacyPolicy() (+74 more)

### Community 1 - "shared.ts"
Cohesion: 0.06
Nodes (54): AppBundle, createApp(), connectDB(), closeRedis(), connectRedis(), RedisConnections, start(), Express (+46 more)

### Community 2 - "sharedLinks.tsx"
Cohesion: 0.10
Nodes (41): DecoratedShared, makeStyles(), sharedId(), SharedLinks(), useAuth(), ClipboardScreen(), makeStyles(), makeStyles() (+33 more)

### Community 3 - "ApiService"
Cohesion: 0.11
Nodes (17): app, firebaseConfig, clip(), Harness(), mockAuth, showAlert, API_ORIGIN, ApiService (+9 more)

### Community 4 - "expo"
Cohesion: 0.04
Nodes (45): backgroundColor, foregroundImage, adaptiveIcon, allowBackup, blockedPermissions, intentFilters, package, projectId (+37 more)

### Community 5 - "backend/package.json"
Cohesion: 0.04
Nodes (45): author, dependencies, cors, dotenv, express, express-rate-limit, firebase-admin, helmet (+37 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (43): socket.io-client, devDependencies, @babel/core, jest, jest-expo, @react-native/jest-preset, @types/jest, @types/react (+35 more)

### Community 7 - "useClipboardSync.ts"
Cohesion: 0.09
Nodes (31): Account(), makeStyles(), TabLayout(), AuthContext, AuthContextProps, AuthProvider(), ClipboardScreenProps, TabBarIcon() (+23 more)

### Community 8 - "keyService.ts"
Cohesion: 0.16
Nodes (33): makeStyles(), Mode, UnlockModal(), deriveKek(), formatRecoveryCode(), generateMasterKey(), generateRecoveryCode(), generateSaltB64() (+25 more)

### Community 9 - "RegionPicker.tsx"
Cohesion: 0.12
Nodes (25): RootLayout(), clientSnapshot(), Description(), makeStyles(), platforms, serverSnapshot(), subscribe(), GatewayRegionRedirect() (+17 more)

### Community 10 - "app/package.json"
Cohesion: 0.07
Nodes (28): engines, node, jest, preset, transformIgnorePatterns, main, name, overrides (+20 more)

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

### Community 15 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, expo, expo-clipboard, expo-router, @expo/vector-icons, expo, expo-clipboard, @expo/vector-icons

### Community 16 - "check-release.mjs"
Cohesion: 0.25
Nodes (7): eas, env, envFile, errors, links, pkg, required

### Community 17 - "region.js"
Cohesion: 0.60
Nodes (4): distanceSquared(), handler(), header(), REGION_CENTERS

### Community 21 - "react-native-qrcode-svg"
Cohesion: 0.67
Nodes (3): react-native-qrcode-svg, react-native-svg, react-native-svg

### Community 22 - "@zxcvbn-ts/language-common"
Cohesion: 0.67
Nodes (3): @zxcvbn-ts/language-common, @zxcvbn-ts/language-en, @zxcvbn-ts/language-en

## Knowledge Gaps
- **250 isolated node(s):** `REGION_CENTERS`, `fs`, `path`, `name`, `slug` (+245 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `expo`, `devDependencies`, `app/package.json`, `react-native-qrcode-svg`, `@zxcvbn-ts/language-common`, `expo-constants`, `expo-crypto`, `expo-device`, `expo-font`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `firebase`, `@noble/ciphers`, `@noble/hashes`, `react`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-web`, `react-native-worklets`, `@scure/base`, `three`, `@zxcvbn-ts/core`?**
  _High betweenness centrality (0.338) - this node is a cross-community bridge._
- **Why does `expo-router` connect `RegionPicker.tsx` to `useTheme`, `sharedLinks.tsx`, `expo`, `useClipboardSync.ts`, `keyService.ts`, `dependencies`?**
  _High betweenness centrality (0.260) - this node is a cross-community bridge._
- **Why does `expo-router` connect `dependencies` to `RegionPicker.tsx`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **What connects `REGION_CENTERS`, `fs`, `path` to the rest of the system?**
  _250 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.05895987251919455 - nodes in this community are weakly interconnected._
- **Should `shared.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055379746835443035 - nodes in this community are weakly interconnected._
- **Should `sharedLinks.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09869375907111756 - nodes in this community are weakly interconnected._