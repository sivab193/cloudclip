import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */

const SITE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://cclip.cc';
const TITLE = 'CloudClip — A quieter way to move text';
const DESCRIPTION =
  'Keep useful text close and share it with a private, expiring link. Encrypted in your browser, with no account needed to share.';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        {/* Lets the browser theme scrollbars, form controls and the URL bar. */}
        <meta name="color-scheme" content="light dark" />

        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={SITE_URL} />

        {/* Link preview (Open Graph — Slack, WhatsApp, LinkedIn, Discord, iMessage). */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CloudClip" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="CloudClip — a quieter way to move text" />

        {/* Link preview (X/Twitter). */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f6f5f1" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#10151b" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CloudClip" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/icon-192.png" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script dangerouslySetInnerHTML={{ __html: initialTheme }} />
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const initialTheme = `try { var saved = localStorage.getItem('cloudclip-theme'); document.documentElement.dataset.theme = saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (_) {}`;

// Must stay in sync with Colors.light.background / Colors.dark.background.
const responsiveBackground = `
:root { --scroll-track: #f0efe9; --scroll-thumb: #adb2b7; }
html[data-theme="dark"] { --scroll-track: #1b222b; --scroll-thumb: #64717b; }
* { scrollbar-width: thin; scrollbar-color: var(--scroll-thumb) var(--scroll-track); }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: var(--scroll-track); }
*::-webkit-scrollbar-thumb { background: var(--scroll-thumb); border: 2px solid var(--scroll-track); border-radius: 10px; }
*::-webkit-scrollbar-thumb:hover { background: #7566cd; }
@media (pointer: coarse), (max-width: 600px) {
  * { scrollbar-width: none; }
  *::-webkit-scrollbar { display: none; }
}
[role="button"], a, input, textarea { transition: background-color .18s, box-shadow .18s, opacity .18s; }
[role="button"]:hover, a:hover { filter: brightness(0.97); }
[role="button"]:active { transform: translateY(1px); }
:focus-visible { outline: 2px solid #7566cd !important; outline-offset: 3px; }
input:focus, textarea:focus { box-shadow: 0 0 0 3px #7566cd22; }
@media (max-width: 600px) { input, textarea { font-size: 16px !important; } }
::selection { background: #bfb5ef; color: #1d2530; }
@keyframes clip-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
[role="dialog"] { animation: clip-enter .3s ease-out; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
body {
  background-color: #f6f5f1;
  font-feature-settings: "kern" 1, "liga" 1;
  -webkit-font-smoothing: antialiased;
}
html[data-theme="dark"] body { background-color: #10151b; color-scheme: dark; }
html[data-theme="light"] body { background-color: #f6f5f1; color-scheme: light; }
`;

// Registered after load so it never competes with the app bundle for bandwidth.
const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.warn('Service worker registration failed:', err);
    });
  });
}`;
