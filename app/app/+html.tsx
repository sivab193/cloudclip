import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */

const SITE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://cclip.cc';
const TITLE = 'CloudClip — Your clipboard, on every device';
const DESCRIPTION =
  'End-to-end encrypted clipboard sync. Copy on one device, paste on another in real time, and share text through expiring links.';
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
        <meta property="og:image:alt" content="CloudClip — end-to-end encrypted clipboard sync" />

        {/* Link preview (X/Twitter). */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6850d8" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090f" media="(prefers-color-scheme: dark)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CloudClip" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/icon-192.png" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Must stay in sync with Colors.light.background / Colors.dark.background.
const responsiveBackground = `
[role="button"], a, input, textarea { transition: background-color .2s, box-shadow .2s, transform .2s, opacity .2s; }
[role="button"]:hover, a:hover { filter: brightness(0.96); }
[role="button"]:active { transform: translateY(1px); }
:focus-visible { outline: 3px solid #9984ef !important; outline-offset: 4px; }
input:focus, textarea:focus { box-shadow: 0 0 0 3px #9984ef25; }
@keyframes clip-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
[role="dialog"] { animation: clip-enter .3s ease-out; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
.cloudclip-aurora { position: absolute; width: 48vw; height: 48vw; min-width: 440px; min-height: 440px; border-radius: 999px; filter: blur(80px); opacity: .72; will-change: transform; }
.cloudclip-aurora-one { top: -20%; right: -12%; animation: cloudclip-float-a 15s ease-in-out infinite alternate; }
.cloudclip-aurora-two { top: 42%; left: -18%; animation: cloudclip-float-b 19s ease-in-out infinite alternate; }
.cloudclip-noise { position: absolute; inset: 0; opacity: .022; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E"); }
@keyframes cloudclip-float-a { to { transform: translate3d(-10%, 14%, 0) scale(1.08); } }
@keyframes cloudclip-float-b { to { transform: translate3d(15%, -9%, 0) scale(.92); } }
body {
  background-color: #f5f5fb;
  font-feature-settings: "kern" 1, "liga" 1;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #09090f;
  }
}
@media (prefers-reduced-motion: reduce) { .cloudclip-aurora { animation: none !important; } }
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
