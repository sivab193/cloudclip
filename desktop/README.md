# CloudClip for macOS

CloudClip for macOS is a local-first clipboard history and screen capture utility. It works without an account, backend, or internet connection. Text, copied images, and captures are written only to Electron's per-user application data directory.

## Features

- Local text and image clipboard history
- Region snipping across connected displays (`⌘⇧5`)
- Full-screen capture (`⌘⇧6`)
- Quick history window (`⌘⇧V`) and menu-bar access
- Search, copy, pin, reveal in Finder, delete, and retention controls
- Optional launch at login
- Explicit text handoff to the existing encrypted CloudClip web app

“Send to CloudClip” is deliberately manual: it copies the selected text and opens the signed-in web app. The user pastes and saves it there. The desktop app never uploads clipboard history in the background. Image sync is not represented as supported because the CloudClip API is text-only today.

## Develop

Requires Node 22.13 or newer and macOS 12 or newer.

```sh
cd desktop
npm ci
npm test
npm run check
npm start
```

The first screen capture prompts macOS for Screen Recording permission. If permission was denied, enable CloudClip or Electron under **System Settings → Privacy & Security → Screen & System Audio Recording**, then restart the app.

## Build

```sh
cd desktop
npm run build:mac
```

Artifacts are written to `desktop/dist/`. Local unsigned builds may require Control-click → Open. Public distribution still needs an Apple Developer ID certificate and notarization.

## Local data

Development data is stored under Electron's `CloudClip` user-data directory. Production data uses the packaged app's corresponding `Application Support` directory. `history.json` and capture PNGs are created with user-only file permissions. Clearing history removes both metadata and locally stored capture files.
