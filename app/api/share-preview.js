const fs = require('node:fs');
const path = require('node:path');

let cachedHtml;

function replaceMeta(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

module.exports = function handler(request, response) {
  if (!cachedHtml) {
    cachedHtml = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
  }

  const hostHeader = String(request.headers.host || 'cclip.cc');
  const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(hostHeader) ? hostHeader : 'cclip.cc';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const imageUrl = `${protocol}://${host}/shared-preview.png`;
  const queryCode = Array.isArray(request.query?.code) ? request.query.code[0] : request.query?.code;
  const code = /^[A-Z0-9]{4}$/i.test(String(queryCode || '')) ? String(queryCode).toUpperCase() : '';
  const shareUrl = code ? `${protocol}://${host}/s/${code}` : `${protocol}://${host}/shared`;
  const title = 'A private clip was shared with you | CloudClip';
  const description = 'Open an encrypted, expiring text clip on CloudClip. No account required.';

  let html = cachedHtml;
  html = replaceMeta(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = replaceMeta(html, /<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`);
  html = replaceMeta(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceMeta(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`);
  html = replaceMeta(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${shareUrl}" />`);
  html = replaceMeta(html, /<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${imageUrl}" />`);
  html = replaceMeta(html, /<meta property="og:image:alt" content="[^"]*"\s*\/>/, '<meta property="og:image:alt" content="CloudClip — a private text clip is ready to open" />');
  html = replaceMeta(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`);
  html = replaceMeta(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${description}" />`);
  html = replaceMeta(html, /<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${imageUrl}" />`);

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  response.status(200).send(html);
};
