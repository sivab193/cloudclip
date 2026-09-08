import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';

if (process.env.EAS_BUILD_PROFILE && process.env.EAS_BUILD_PROFILE !== 'production') {
  console.log('Production configuration gate skipped for this non-production build profile.');
  process.exit(0);
}

const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url))).expo;
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url)));
const envFile = new URL('../.env', import.meta.url);
const env = { ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}), ...process.env };
const errors = [];
if (pkg.version !== config.version) errors.push('package.json and app.json versions differ');
if (config.android.package !== 'com.cloudclip') errors.push('Android application ID changed');
if (config.android.allowBackup !== false) errors.push('Android backups must exclude local account/key material');
if (eas.build.production.android.buildType !== 'app-bundle') errors.push('Production must build an AAB');
if (eas.submit.production.android.track !== 'internal') errors.push('Initial submission must target internal testing');
const required = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL', 'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_FIREBASE_APP_ID'];
for (const key of required) {
  if (!env[key] || /your-|placeholder|REPLACE_/i.test(env[key])) errors.push(`Missing production value: ${key}`);
}
for (const key of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL']) {
  try {
    const url = new URL(env[key]);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /localhost|127\.0\.0\.1/.test(url.hostname)) {
      errors.push(`${key} must be a public HTTPS origin without a path or credentials`);
    }
  } catch { errors.push(`Invalid origin: ${key}`); }
}
const links = JSON.parse(readFileSync(new URL('../public/.well-known/assetlinks.json', import.meta.url)));
if (!links.some(link => link.target?.package_name === config.android.package &&
  link.target.sha256_cert_fingerprints?.some(fp => /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(fp)))) {
  errors.push('Android App Links needs a valid SHA-256 signing fingerprint');
}
if (errors.length) {
  console.error(errors.map(error => `FAIL: ${error}`).join('\n'));
  process.exit(1);
}
console.log('Release configuration checks passed. Verify the Play app-signing fingerprint and device test checklist before submission.');
