import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { zipSync, strToU8 } from 'fflate';
import { createApp, AppBundle } from '../../app';
import PublishedSite from '../../models/PublishedSite';
import SiteDeployment from '../../models/SiteDeployment';
import PublisherKey from '../../models/PublisherKey';

process.env.SITES_SESSION_SECRET = 'cloudclip-test-sites-session-secret';
process.env.SITES_PUBLIC_ORIGIN = 'https://cclip.cc';

jest.mock('firebase-admin/app', () => ({ getApps: () => [{}] }));
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn((token: string) => {
      if (token === 'token_a') return Promise.resolve({ uid: 'user_a', email: 'a@example.com', auth_time: Date.now() / 1000 });
      if (token === 'token_b') return Promise.resolve({ uid: 'user_b', email: 'b@example.com', auth_time: Date.now() / 1000 });
      return Promise.reject(new Error('Invalid token'));
    }),
  }),
}));

const asA = { Authorization: 'Bearer token_a' };
const asB = { Authorization: 'Bearer token_b' };

const htmlFile = (body = '<!doctype html><title>Home</title><h1>Hello</h1>') => Buffer.from(body, 'utf8');

const zipBuild = (files: Record<string, string>): Buffer =>
  Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));

describe('Hosted Sites', () => {
  let bundle: AppBundle;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await Promise.all([PublishedSite.createIndexes(), SiteDeployment.createIndexes(), PublisherKey.createIndexes()]);
    bundle = createApp();
  });

  afterAll(async () => {
    bundle.io.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Promise.all([PublishedSite.deleteMany({}), SiteDeployment.deleteMany({}), PublisherKey.deleteMany({})]);
  });

  describe('publishing (owner)', () => {
    it('requires auth to publish', async () => {
      await request(bundle.app).post('/api/sites').attach('source', htmlFile(), 'index.html').expect(401);
    });

    it('publishes a single HTML file and returns a durable URL', async () => {
      const res = await request(bundle.app)
        .post('/api/sites')
        .set(asA)
        .field('slug', 'my-site')
        .field('displayName', 'My Site')
        .attach('source', htmlFile(), 'index.html')
        .expect(201);
      expect(res.body.slug).toBe('my-site');
      expect(res.body.url).toBe('https://cclip.cc/s/my-site');
      expect(res.body.status).toBe('ready');
      expect(res.body.deploymentId).toBeDefined();
    });

    it('serves the published HTML with no-login viewing and nosniff', async () => {
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'view-me').attach('source', htmlFile(), 'index.html').expect(201);
      const res = await request(bundle.app).get('/s/view-me').expect(200);
      expect(res.text).toContain('Hello');
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      // No CloudClip auth cookies ever set on served content.
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('sandboxes served HTML so user scripts cannot reach the app origin', async () => {
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'sandboxed').attach('source', htmlFile(), 'index.html').expect(201);
      const html = await request(bundle.app).get('/s/sandboxed').expect(200);
      expect(html.headers['content-security-policy']).toContain('sandbox');
      expect(html.headers['content-security-policy']).toContain('allow-scripts');

      // Non-document assets are not sandboxed (meaningless) but still nosniff.
      const zip = zipBuild({ 'index.html': '<!doctype html><title>x</title>', 'app.js': 'x' });
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'assets-site').attach('source', zip, 'b.zip').expect(201);
      const js = await request(bundle.app).get('/s/assets-site/app.js').expect(200);
      expect(js.headers['content-security-policy']).toBeUndefined();
      expect(js.headers['x-content-type-options']).toBe('nosniff');
    });

    it('publishes a ZIP build with nested assets and SPA routes', async () => {
      const zip = zipBuild({
        'index.html': '<!doctype html><title>SPA</title><script src="/assets/app.js"></script>',
        'assets/app.js': 'console.log("app")',
        'assets/style.css': 'body{color:red}',
      });
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'spa').attach('source', zip, 'build.zip').expect(201);

      const js = await request(bundle.app).get('/s/spa/assets/app.js').expect(200);
      expect(js.headers['content-type']).toContain('javascript');
      expect(js.text).toContain('app');

      const css = await request(bundle.app).get('/s/spa/assets/style.css').expect(200);
      expect(css.headers['content-type']).toContain('text/css');

      // Client-side route with no extension → SPA fallback to index.html.
      const route = await request(bundle.app).get('/s/spa/dashboard').expect(200);
      expect(route.text).toContain('SPA');
    });

    it('never SPA-falls-back for a missing JS asset', async () => {
      const zip = zipBuild({ 'index.html': '<!doctype html><title>x</title>', 'assets/app.js': 'x' });
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'nofb').attach('source', zip, 'b.zip').expect(201);
      await request(bundle.app).get('/s/nofb/assets/missing.js').expect(404);
    });

    it('accepts a ZIP wrapped in one top-level folder', async () => {
      const zip = zipBuild({ 'dist/index.html': '<!doctype html><title>Wrapped</title>', 'dist/app.js': 'x' });
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'wrapped').attach('source', zip, 'b.zip').expect(201);
      const res = await request(bundle.app).get('/s/wrapped').expect(200);
      expect(res.text).toContain('Wrapped');
    });

    it('rejects a ZIP with no index.html', async () => {
      const zip = zipBuild({ 'app.js': 'x', 'style.css': 'y' });
      const res = await request(bundle.app).post('/api/sites').set(asA).field('slug', 'noindex').attach('source', zip, 'b.zip').expect(422);
      expect(res.body.code).toBe('missing_index');
    });

    it('rejects path traversal in the archive', async () => {
      const zip = zipBuild({ 'index.html': 'x', '../evil.js': 'pwn' });
      const res = await request(bundle.app).post('/api/sites').set(asA).field('slug', 'evil').attach('source', zip, 'b.zip').expect(422);
      expect(res.body.code).toBe('invalid_archive');
    });

    it('rejects unsupported file types', async () => {
      const res = await request(bundle.app).post('/api/sites').set(asA).field('slug', 'bad').attach('source', Buffer.from('x'), 'malware.exe').expect(422);
      expect(res.body.code).toBe('unsupported_type');
    });

    it('409s on a duplicate slug (case-insensitive) and reserved slugs', async () => {
      await request(bundle.app).post('/api/sites').set(asA).field('slug', 'taken').attach('source', htmlFile(), 'index.html').expect(201);
      const dup = await request(bundle.app).post('/api/sites').set(asB).field('slug', 'TAKEN').attach('source', htmlFile(), 'index.html').expect(409);
      expect(dup.body.code).toBe('slug_taken');
      const reserved = await request(bundle.app).post('/api/sites').set(asA).field('slug', 'admin').attach('source', htmlFile(), 'index.html').expect(409);
      expect(reserved.body.code).toBe('slug_reserved');
    });

    it('auto-generates a slug when none is provided', async () => {
      const res = await request(bundle.app).post('/api/sites').set(asA).attach('source', htmlFile(), 'index.html').expect(201);
      expect(res.body.slug).toMatch(/^site-[0-9a-f]{10}$/);
    });
  });

  describe('redeploy & lifecycle', () => {
    const publish = (slug: string, headers = asA) =>
      request(bundle.app).post('/api/sites').set(headers).field('slug', slug).attach('source', htmlFile('<!doctype html><title>v1</title>'), 'index.html');

    it('redeploy keeps the URL and swaps content; a failed redeploy leaves v1 serving', async () => {
      const created = await publish('redeploy').expect(201);
      const id = created.body.siteId;

      const v2 = zipBuild({ 'index.html': '<!doctype html><title>v2</title>' });
      await request(bundle.app).post(`/api/sites/${id}/deployments`).set(asA).attach('source', v2, 'v2.zip').expect(201);
      const afterGood = await request(bundle.app).get('/s/redeploy').expect(200);
      expect(afterGood.text).toContain('v2');

      // Failed redeploy (no index) must not disturb the live v2.
      const bad = zipBuild({ 'app.js': 'x' });
      await request(bundle.app).post(`/api/sites/${id}/deployments`).set(asA).attach('source', bad, 'bad.zip').expect(422);
      const afterBad = await request(bundle.app).get('/s/redeploy').expect(200);
      expect(afterBad.text).toContain('v2');
    });

    it('lists only the caller\'s sites and scopes get/delete to the owner', async () => {
      await publish('a-site', asA).expect(201);
      await publish('b-site', asB).expect(201);
      const listA = await request(bundle.app).get('/api/sites').set(asA).expect(200);
      expect(listA.body).toHaveLength(1);
      expect(listA.body[0].slug).toBe('a-site');

      const bId = (await request(bundle.app).get('/api/sites').set(asB)).body[0].id;
      await request(bundle.app).get(`/api/sites/${bId}`).set(asA).expect(404);
      await request(bundle.app).delete(`/api/sites/${bId}`).set(asA).expect(404);
    });

    it('deleting a site produces a 404 before object cleanup', async () => {
      const created = await publish('delete-me').expect(201);
      await request(bundle.app).get('/s/delete-me').expect(200);
      await request(bundle.app).delete(`/api/sites/${created.body.siteId}`).set(asA).expect(200);
      await request(bundle.app).get('/s/delete-me').expect(404);
    });
  });

  describe('password protection', () => {
    const publishLocked = () =>
      request(bundle.app).post('/api/sites').set(asA)
        .field('slug', 'secret').field('visibility', 'password').field('password', 'hunter2')
        .attach('source', htmlFile('<!doctype html><title>Secret</title>secret-body'), 'index.html');

    it('denies content before unlock and serves after correct password', async () => {
      await publishLocked().expect(201);

      const locked = await request(bundle.app).get('/s/secret').expect(401);
      expect(locked.text).toContain('Enter password');
      expect(locked.text).not.toContain('secret-body');

      const wrong = await request(bundle.app).post('/s/secret/_cloudclip/unlock').type('form').send({ password: 'nope', next: '/s/secret/' }).expect(401);
      expect(wrong.text).toContain('did not match');

      const ok = await request(bundle.app).post('/s/secret/_cloudclip/unlock').type('form').send({ password: 'hunter2', next: '/s/secret/' }).expect(303);
      const cookie = ok.headers['set-cookie'][0];
      expect(cookie).toContain('ccsite_access_secret=');

      const unlocked = await request(bundle.app).get('/s/secret').set('Cookie', cookie.split(';')[0]).expect(200);
      expect(unlocked.text).toContain('secret-body');
    });

    it('never returns the password hash on owner reads', async () => {
      const created = await publishLocked().expect(201);
      const got = await request(bundle.app).get(`/api/sites/${created.body.siteId}`).set(asA).expect(200);
      expect(got.body.passwordHash).toBeUndefined();
      expect(got.body.passwordSalt).toBeUndefined();
    });

    it('rate limits password attempts', async () => {
      await publishLocked().expect(201);
      let last = 401;
      for (let i = 0; i < 25; i++) {
        const r = await request(bundle.app).post('/s/secret/_cloudclip/unlock').type('form').send({ password: 'x', next: '/s/secret/' });
        last = r.status;
        if (last === 429) break;
      }
      expect(last).toBe(429);
    });
  });

  describe('publisher keys & agent publishing', () => {
    it('creates a key shown once, publishes via the key, and revokes it', async () => {
      const created = await request(bundle.app).post('/api/sites/keys').set(asA).send({ label: 'My agent' }).expect(201);
      const raw = created.body.key as string;
      expect(raw).toMatch(/^cc_pub_/);

      // List never exposes the raw key.
      const list = await request(bundle.app).get('/api/sites/keys/list').set(asA).expect(200);
      expect(list.body[0].key).toBeUndefined();
      expect(list.body[0].keyPrefix).toBe(created.body.keyPrefix);

      // Publish with the key → site owned by the key's owner.
      const pub = await request(bundle.app).post('/api/sites/publish')
        .set({ Authorization: `Bearer ${raw}` })
        .field('slug', 'agent-site')
        .attach('source', htmlFile('<!doctype html><title>Agent</title>'), 'index.html')
        .expect(201);
      expect(pub.body.slug).toBe('agent-site');
      const ownerList = await request(bundle.app).get('/api/sites').set(asA).expect(200);
      expect(ownerList.body.some((s: any) => s.slug === 'agent-site')).toBe(true);

      // Revoke → key no longer works.
      await request(bundle.app).delete(`/api/sites/keys/${created.body.id}`).set(asA).expect(200);
      await request(bundle.app).post('/api/sites/publish')
        .set({ Authorization: `Bearer ${raw}` })
        .field('slug', 'agent-site-2')
        .attach('source', htmlFile(), 'index.html')
        .expect(401);
    });

    it('rejects an unknown publisher key', async () => {
      await request(bundle.app).post('/api/sites/publish')
        .set({ Authorization: 'Bearer cc_pub_totallyboguskey123' })
        .attach('source', htmlFile(), 'index.html')
        .expect(401);
    });
  });
});
