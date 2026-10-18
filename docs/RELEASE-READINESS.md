# Release readiness — 2026-09-08 snapshot

This is a historical release-candidate snapshot, not a current production status report. **It is not proof of readiness for public Play distribution.** Re-run every check against the current commit before relying on a result below.

## Verified locally

| Check | Result |
| --- | --- |
| App strict TypeScript and unused-symbol checks | Pass |
| App regression tests | 53 pass across crypto, key lifecycle, sharing helpers, sync decisions and async sync/account boundaries |
| Backend TypeScript build and integration tests | Build passes; 30 tests pass using ephemeral MongoDB and mocked Firebase |
| Dependency audits | Historical result only. The October 2026 frontend audit reports outstanding advisories; the backend production-dependency audit currently passes. |
| Expo Doctor | 21/21 checks pass |
| Release configuration gate | Pass; validates shape, not external credentials |
| Web static export | Pass |
| Android JavaScript/Hermes export | Pass; not a native APK/AAB build |
| Android native prebuild | Pass; generated project is ignored, not committed |
| Browser smoke | Home, privacy, deletion and invalid-link pages at widths 1280, 390 and 320; sign-in opening/closing; encrypted share retrieval through four-character codes, short URLs, legacy fragments and internal navigation; no runtime errors |
| Store feature graphic | Rendered and visually inspected, 1024×500 PNG |

Browser sharing used a synthetic encrypted response, not production accounts. It checked that only the eight-character public lookup prefix reaches the API. This is not proof that production authentication or synchronization works.

## Important fixes and cleanup

- REST saves update the originating UI, support idempotent retries, and notify other devices. Reconnects repair missed events.
- Async results cannot replace another account's state or revive a locked session. A server-side key-ID precondition rejects clipboard/share writes overtaken by a key reset.
- Key storage is account-scoped and ordered; recovery preserves independent KDF parameters. Recovery only unlocks after a successful key write.
- Key updates use compare-and-set. Destructive reset/deletion reauthenticate the user, serialize mutations, and check token revocation.
- Device ownership, malformed IDs, name preservation, socket expiry/rate limiting, cache boundaries and foreground clipboard consent are handled explicitly.
- Short code-only links, legacy web share fragments, static icon-font loading and dark-theme hydration are supported. Sign-in has an explicit close action, and confirmation dialogs have safe back/dismiss handlers.
- Removed unused helpers, duplicate screen/sync/deletion logic, unused `nanoid` dependencies and the unconfigured development-client build profile. Consolidating icons eliminates about 1.5 MB of raw font assets from the three single-icon fonts alone.
- Replaced obsolete Redis/file-transfer/provider assumptions with [accepted architecture decisions](ARCHITECTURE.md), an [API contract](API.md), and deployment/rollback instructions. Dependency folders and generated build output are not source-code size.
- CI validates both packages on relevant pushes. The former manual SSH backend deployment workflow was retired in October 2026; regional backends are deployed from their respective hosts.

## Release blockers requiring owner input or external validation

1. **Regional production APIs:** deploy the US and India backend stacks, route `api-us.cclip.cc` and `api.in.cclip.cc`, and verify real two-device authentication/sync/deletion flows inside each region.
2. **Android signing:** the attempted EAS production build stopped before upload/native compilation because no existing signing key was available and noninteractive builds cannot generate one. EAS incremented remote versionCode from 2 to 3; no new AAB was produced. Confirm whether Play Console already owns this application and recover/configure the correct upload keystore. Generate a new key only if appropriate for that app's signing history. Never use the generated debug keystore for release.
3. **Signed native build and device testing:** after signing is resolved, build the production AAB and inspect its actual manifest, target SDK and native 16 KB alignment. Run the complete [device checklist](store-submission.md), including upgrade, password/recovery/reset and cross-account cases. JavaScript export and prebuild do not replace this gate.
4. **Play Console:** verify the Play app-signing fingerprint, supply actual Android screenshots, complete truthful Data safety/content-rating/app-access declarations, and satisfy any account-specific testing requirements.

The older SDK 56/versionCode 2 EAS build is not evidence for this candidate. The attempted build's reserved versionCode is intentionally not reset; the next production build can increment it again.
