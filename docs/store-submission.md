# Google Play release checklist

Last reviewed: 2026-09-08. This is a release candidate checklist, not a claim that Google Play submission or review has completed. See [verification and blockers](RELEASE-READINESS.md).

## Listing draft

App name: **CloudClip — Clipboard Sync**

Short description: **Sync copied text across your devices with end-to-end encryption.**

Full description:

> Save text on one device and access it on another with CloudClip.
>
> ENCRYPTED TEXT SYNC
> Clipboard entries are encrypted before upload. Sign in on your devices to access your recent text history.
>
> YOU CONTROL CLIPBOARD ACCESS
> Paste and save text manually, or enable automatic clipboard sync while CloudClip is open. Automatic access is off by default.
>
> EXPIRING SHARE LINKS
> Share text using an encrypted short link or four-character code. Anyone with either can read it. Choose an expiry from 10 minutes to 30 days; signed-in owners can change or delete active links.
>
> MANAGE YOUR DATA
> Delete individual entries, clear your history, or delete your account and associated data.
>
> No ads. Also available in the browser at https://cclip.cc.
>
> Privacy policy: https://cclip.cc/privacy

Category: Productivity. Support contact: sivaganesh1903@gmail.com.

## Assets

- App icon: `app/public/icon-512.png` (512×512).
- Feature graphic: `docs/store-assets/feature-graphic.png` (1024×500), with editable SVG alongside it.
- At least two **actual Android app screenshots** are still required. Capture history with representative test entries and the sharing/account screens. Browser QA captures do not substitute for proof of the Android experience.
- Review screenshots for personal data, passwords, recovery codes and real share tokens before upload.

## Build and device gates

- Run app and backend tests, type checks, audits and Expo Doctor.
- Run `npm run check:release` in `app/`. It validates configuration shape, not the availability or correctness of external credentials.
- Confirm the API, web privacy URL and web deletion URL are reachable.
- Build `eas build --platform android --profile production`. Remote versionCode auto-increments; production generates an AAB.
- Inspect the resulting bundle's target SDK and native alignment. New apps/updates must target API 36 or higher under the [current target-API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).
- Verify native libraries and an Android 16 KB environment using the [Android page-size guide](https://developer.android.com/guide/practices/page-sizes). The current guide lists February 1, 2027 as the update-blocking deadline; do not infer binary compatibility from a JavaScript export alone.
- Test a fresh install, upgrade from 1.1.0/versionCode 2, sign-up and recovery-code display, login after restarting, explicit Paste/Save, opt-in foreground sync, simultaneous two-device saves, delete/clear, offline errors/reconnect, share-link opening and expiry.
- Test account switching, wrong-password recovery/reset, password change, recovery after a password reset, key reset on another device, and account deletion from both app and browser.
- Confirm the release requests no microphone, storage or overlay permissions. No background clipboard/accessibility service is used.
- Test large font settings, dark mode, keyboard visibility, Android back navigation and edge-to-edge layout on a physical device.
- Verify App Links against the **Play app-signing** SHA-256 fingerprint. The existing assetlinks fingerprint has not been verified against Play Console.

## Console requirements

Complete the real Console questionnaires after inspecting the final bundle and deployed providers; do not copy speculative answers.

Data inventory for the Data safety review: email, display name, Firebase user ID, installation/device IDs and labels, encrypted user content, and provider technical logs. Document purposes, required/optional status, service-provider processing, retention and deletion accurately. Verify any E2E exclusions against [Google's Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469).

Account deletion is available inside each regional app's Account screen, with password reauthentication. See [Google's account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111). Verify both regional flows.

Declare private text sharing accurately in the content-rating/user-interaction questionnaire. Private links can transfer user-generated content; do not automatically answer “no interaction.” Supply a designated reviewer/test account through Play Console; never commit credentials.

Review target audience, ads declaration, app access, developer verification and any testing requirements shown for this account. For newly created personal accounts, see the [closed-testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465); verify whether this account is subject to them.

## Submit

The submit profile targets an **internal draft**. Do not promote until the device and production-service gates are complete.

```sh
cd app
eas submit --platform android --profile production --id <verified-build-id>
```

A Play API service-account key belongs in ignored `app/play-service-account.json`, or use the supported managed credential flow. The first upload may need to be performed manually in Play Console. Publishing is a separate owner decision.

iOS is not certified by this Android review. Its associated-domain team ID, signing, privacy manifest, export-compliance answers and actual-device tests need a separate release pass.
