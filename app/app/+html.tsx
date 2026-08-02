import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */

const SITE_URL = 'https://cc.siv19.dev';
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
        <meta name="theme-color" content="#0A7EA4" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#151718" media="(prefers-color-scheme: dark)" />
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
body {
  background-color: #ffffff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #151718;
  }
}`;

// Registered after load so it never competes with the app bundle for bandwidth.
const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (err) {
      console.warn('Service worker registration failed:', err);
    });
  });
}`;
