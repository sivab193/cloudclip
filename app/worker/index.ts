const RELEASES = {
  '/downloads/cloudclip-macos.dmg': {
    chunks: [
      'releases/1.0.0/dmg.part.00',
      'releases/1.0.0/dmg.part.01',
      'releases/1.0.0/dmg.part.02',
    ],
    size: 120631175,
    etag: '"sha256-6f6a3ab5c299ca994b10a0b247278ed22256bd634394a22f3a44c706c5f43270"',
    filename: 'CloudClip-1.0.0-arm64.dmg',
    contentType: 'application/x-apple-diskimage',
  },
} as const;

const APP_CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.in.cclip.cc wss://api.in.cclip.cc https://api-us.cclip.cc wss://api-us.cclip.cc https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://www.googleapis.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

const REGION_CENTERS = {
  in: { latitude: 19.076, longitude: 72.8777 },
  us: { latitude: 39.0438, longitude: -77.4874 },
};

function distanceSquared(latitude: number, longitude: number, center: { latitude: number; longitude: number }) {
  const latitudeDelta = latitude - center.latitude;
  const longitudeDelta = (longitude - center.longitude) * Math.cos(latitude * Math.PI / 180);
  return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta;
}

function securityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', APP_CSP);
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function regionResponse(request: Request) {
  const country = (request.headers.get('CF-IPCountry') || '').toUpperCase();
  const latitude = Number(request.cf?.latitude);
  const longitude = Number(request.cf?.longitude);
  let closestRegion = country === 'IN' ? 'in' : 'us';
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    closestRegion = distanceSquared(latitude, longitude, REGION_CENTERS.in)
      < distanceSquared(latitude, longitude, REGION_CENTERS.us) ? 'in' : 'us';
  }
  return Response.json({
    country: country || null,
    closestRegion,
    recommendedRegion: closestRegion === 'in' ? 'us' : closestRegion,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function download(request: Request, env: Env, release: (typeof RELEASES)[keyof typeof RELEASES]) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (request.headers.get('If-None-Match') === release.etag) return new Response(null, { status: 304 });
  const headers = new Headers();
  headers.set('Content-Type', release.contentType);
  headers.set('Content-Disposition', `attachment; filename="${release.filename}"`);
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('ETag', release.etag);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Length', String(release.size));
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });

  let chunkIndex = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          if (!reader) {
            if (chunkIndex >= release.chunks.length) { controller.close(); return; }
            const object = await env.RELEASES.get(release.chunks[chunkIndex]);
            if (!object) throw new Error(`Missing release chunk ${chunkIndex}`);
            reader = object.body.getReader();
          }
          const result = await reader.read();
          if (result.done) { reader = null; chunkIndex += 1; continue; }
          controller.enqueue(result.value);
          return;
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) { await reader?.cancel(reason); },
  });
  return new Response(body, { status: 200, headers });
}

async function sharePreview(request: Request, env: Env, code: string) {
  const asset = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
  let html = await asset.text();
  const origin = new URL(request.url).origin;
  const shareUrl = code ? `${origin}/t/${code}` : `${origin}/shared`;
  const title = 'A private clip was shared with you | CloudClip';
  const description = 'Open an encrypted, expiring text clip on CloudClip. No account required.';
  const replacements: Array<[RegExp, string]> = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`],
    [/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`],
    [/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`],
    [/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`],
    [/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${shareUrl}" />`],
    [/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${origin}/shared-preview.png" />`],
  ];
  for (const [pattern, value] of replacements) html = html.replace(pattern, value);
  return securityHeaders(new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
  }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const release = RELEASES[url.pathname as keyof typeof RELEASES];
    if (release) return download(request, env, release);
    if (url.pathname === '/api/region') return regionResponse(request);
    if (url.pathname === '/api/share-preview') {
      const code = (url.searchParams.get('code') || '').toUpperCase();
      return sharePreview(request, env, /^[A-Z0-9]{4}$/.test(code) ? code : '');
    }
    const textShare = url.pathname.match(/^\/t\/([A-Z0-9]{4})\/?$/i);
    if (textShare) return sharePreview(request, env, textShare[1].toUpperCase());
    if (url.pathname === '/s' || url.pathname.startsWith('/s/')) {
      const upstream = new URL(url.pathname + url.search, 'https://api-us.cclip.cc');
      return fetch(new Request(upstream, request));
    }
    return securityHeaders(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env>;
