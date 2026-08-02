# CloudClip — Store Submission Kit

Everything needed to publish to Google Play now and the App Store later.

---

## 1. Google Play listing content

**App name (30 chars max):** `CloudClip — Clipboard Sync`

**Short description (80 chars max):**
> Sync copied text across your devices. End-to-end encrypted clipboard manager.

**Full description:**
> CloudClip keeps your clipboard in sync across all your devices — phone, laptop, and web — with true end-to-end encryption.
>
> ✦ SYNC ACROSS DEVICES
> Copy text on one device, open CloudClip on another, and it's there. Your clipboard history is always at hand.
>
> ✦ END-TO-END ENCRYPTED
> Your clips are encrypted on your device before they ever leave it. Our servers store only ciphertext — nobody but you can read your data, not even us.
>
> ✦ SHARE TEXT INSTANTLY
> Share any text with a link or a short code. Links are encrypted too and expire automatically (7 days by default), so shared text doesn't live forever.
>
> ✦ CLIPBOARD HISTORY
> Browse, copy, and manage your saved clips. Delete one, or wipe everything with one tap — on every device at once.
>
> ✦ YOUR DATA, YOUR CONTROL
> No ads, no tracking, no selling data. Delete your account and all data anytime, right from the app.
>
> Also available in the browser at https://cc.siv19.dev
>
> Privacy policy: https://cc.siv19.dev/privacy

**Category:** Productivity / Tools
**Contact email:** sivaganesh1903@gmail.com
**Privacy policy URL:** `https://cc.siv19.dev/privacy`

### Graphics needed (create before submitting)
| Asset | Size | Notes |
|---|---|---|
| App icon | 512×512 PNG | downscale `app/assets/images/icon.png` |
| Feature graphic | 1024×500 PNG | **must be created** — logo on plain background is fine |
| Phone screenshots | ≥2, 16:9 or 9:16, min 320px | Home tab with entries; Share flow with link dialog; Account/security tab |
| 7"/10" tablet screenshots | optional but recommended | web view screenshots at tablet size are acceptable |

## 2. Play Data safety form answers

- **Does your app collect or share any of the required user data types?** Yes.
- **Data types collected:**
  - *Personal info → Email address*: Collected. Required. Purpose: Account management. Not shared. Encrypted in transit. Deletable.
  - *Personal info → Name*: Collected. Optional. Purpose: Account management. Not shared. Encrypted in transit. Deletable.
  - *App activity → Other user-generated content* (clipboard text): Collected. Required for functionality. Purpose: App functionality. Not shared. Encrypted in transit (note in free text: also end-to-end encrypted; the server cannot read it). Deletable.
  - *Device or other IDs* (app-generated device ID): Collected. Required. Purpose: App functionality. Not shared. Deletable.
- **Is all of the user data collected by your app encrypted in transit?** Yes.
- **Do you provide a way for users to request that their data is deleted?** Yes — in-app (Account tab → Delete account) and at `https://cc.siv19.dev/delete-account`.
- **Data sharing:** None. (Firebase Authentication acts as a service provider/processor, not "sharing" under Play's definition.)

## 3. Content rating questionnaire (IARC)

- Category: **Utility/Productivity/Communication or other**
- Violence/sexuality/profanity/drugs/gambling: **No** to all.
- User interaction: users can share text via private links, but there is **no public user-to-user interaction, no discoverable content, no user profiles visible to others** → answer "No" to "users can interact"‐style questions; shared links are private URLs.
- Expected rating: **Everyone / PEGI 3**.

## 4. Play release path (personal dev account)

1. Pay the $25 registration fee, complete identity verification (can take 1–2 days).
2. Create app → fill Store listing, Data safety, Content rating (all content above).
3. `cd app && eas build --platform android --profile production`
4. **Internal testing** track: upload the AAB (or `eas submit -p android`), add your own Gmail as tester → install on your devices immediately.
5. **Closed testing** track: promote the build, recruit **12 testers who stay opted-in for 14 consecutive days** (friends/family; there are also tester-exchange communities). This is mandatory for personal accounts created after Nov 2023 before production access.
6. After 14 days: apply for **production access** in Play Console (answers about your testing learnings), then promote to Production.
7. First submission review typically takes 1–7 days.

## 5. iOS — code-ready checklist (submit later)

Already done in code:
- `ios.bundleIdentifier: com.cloudclip`, associated domains for `cc.siv19.dev`, in-app account deletion (Guideline 5.1.1(v)), privacy policy page.
- Expo SDK 56 auto-generates the iOS privacy manifest for required-reason APIs.

To do at submission time:
1. Pay Apple Developer Program ($99/yr).
2. Replace `REPLACE_WITH_TEAM_ID` in `app/public/.well-known/apple-app-site-association` with your Team ID and redeploy the web app.
3. `eas build --platform ios --profile production` (EAS manages certs).
4. App Privacy labels in App Store Connect: mirror the Play data-safety answers (Email, Name, User Content [clipboard], Device ID — all "linked to you", none used for tracking).
5. Export compliance: app uses standard encryption (AES/HTTPS) → "uses exempt encryption"; answer the encryption questions accordingly (`ITSAppUsesNonExemptEncryption` handled in the questionnaire; standard-algorithm exemption applies, France declaration not needed for standard crypto).
6. TestFlight → App Review. Include a demo account (email+password) in review notes.
7. Screenshots: 6.7" and 6.1" iPhone sizes minimum.

## 6. Infrastructure launch checklist (manual, one-time)

1. **Rotate the Firebase service-account key** (it sat in `backend/.env` and old Docker layers):
   GCP Console → IAM & Admin → Service Accounts → `firebase-adminsdk@cloud-clip-2a653` → Keys → delete old, add new → update `backend/.env` on the VM. Then on the VM: `docker image prune -a`.
2. **DNS (where siv19.dev is managed):**
   - `A` record: `cc-api` → GCP VM static IP (reserve a static IP in GCP → VPC network → IP addresses if not already).
   - `CNAME`: `cc` → `cname.vercel-dns.com` (then add `cc.siv19.dev` as the domain in the Vercel project).
3. **GCP firewall:** allow TCP 80 + 443; **remove/deny 3000 and 6379**.
4. **VM `.env`** (`~/cloudclip/backend/.env`): `MONGODB_URI`, `ALLOWED_ORIGINS=https://cc.siv19.dev`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (new key). Remove `REDIS_URL`.
5. **Vercel env vars:** `EXPO_PUBLIC_API_URL=https://cc-api.siv19.dev`, `EXPO_PUBLIC_WEB_URL=https://cc.siv19.dev`, plus the `EXPO_PUBLIC_FIREBASE_*` values from `app/.env`.
6. **Android App Links:** after the first production build, run `eas credentials -p android`, copy the SHA-256 fingerprint into `app/public/.well-known/assetlinks.json`, redeploy web.
7. **Play submit key:** Play Console → Setup → API access → create a service account, download JSON to `app/play-service-account.json` (gitignored).
8. First deploy: push to `main` (CI runs tests, then deploys) or on the VM: `cd ~/cloudclip/backend && docker compose up -d --build`. Verify `https://cc-api.siv19.dev/health`.
