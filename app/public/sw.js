/*
 * CloudClip service worker.
 *
 * Deliberately conservative about what it stores. The app is end-to-end
 * encrypted and the master key lives in sessionStorage, so this caches only
 * the static app shell — never API responses, never anything user-specific.
 *
 * Strategies:
 *   - API / WebSocket traffic .... network only, never touched
 *   - Hashed build assets ........ cache first (content-hashed, immutable)
 *   - Navigations ................ network first, cache fallback when offline
 *
 * Bump CACHE_VERSION to evict every previous cache on the next activation.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `cloudclip-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `cloudclip-assets-${CACHE_VERSION}`;

// Kept minimal on purpose: a fat precache list goes stale on every deploy.
const SHELL_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            // Individual failures must not abort the whole install.
            .then((cache) => Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

/** Content-hashed build output — safe to serve from cache indefinitely. */
const isImmutableAsset = (url) =>
    url.pathname.startsWith('/_expo/static/') || /\.[0-9a-f]{8,}\.(js|css|woff2?|ttf)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only GET is cacheable; everything else goes straight to the network.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Cross-origin (the API, Firebase, sockets) is never cached or inspected.
    if (url.origin !== self.location.origin) return;

    if (isImmutableAsset(url)) {
        event.respondWith(
            caches.match(request).then(
                (hit) =>
                    hit ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    })
            )
        );
        return;
    }

    if (request.mode === 'navigate') {
        // Network first so a new deploy is picked up immediately; the cached
        // shell is only a fallback for genuinely offline loads.
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
                    }
                    return response;
                })
                .catch(() => caches.match('/').then((hit) => hit || Response.error()))
        );
    }
});
