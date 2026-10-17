import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp, AppBundle } from '../../app';
import User from '../../models/User';
import Device from '../../models/Device';
import Clipboard from '../../models/Clipboard';
import Shared from '../../models/Shared';

const deleteUserMock = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase-admin/app', () => ({ getApps: () => [{}] }));
jest.mock('firebase-admin/auth', () => {
  return {
    getAuth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn((token: string) => {
        if (token === 'token_a') {
          return Promise.resolve({ uid: 'user_a', email: 'a@example.com', auth_time: Date.now() / 1000 });
        }
        if (token === 'token_b') {
          return Promise.resolve({ uid: 'user_b', email: 'b@example.com', auth_time: Date.now() / 1000 });
        }
        return Promise.reject(new Error('Invalid token'));
      }),
      deleteUser: (uid: string) => deleteUserMock(uid),
    }),
  };
});

const asA = { Authorization: 'Bearer token_a' };
const asB = { Authorization: 'Bearer token_b' };

const VALID_KEYS = {
  wrappedKey: 'd2t3', // arbitrary base64ish strings — server never inspects them
  wrapNonce: 'bm9uY2U=',
  salt: 'c2FsdA==',
  kdf: { name: 'scrypt', N: 32768, r: 8, p: 1 },
  recoveryWrappedKey: 'cndr',
  recoveryNonce: 'cm4=',
  recoverySalt: 'cnM=',
  keyVersion: 1,
};

describe('REST routes', () => {
  let bundle: AppBundle;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    bundle = createApp();
  });

  afterAll(async () => {
    bundle.io.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Device.deleteMany({}),
      Clipboard.deleteMany({}),
      Shared.deleteMany({}),
    ]);
    deleteUserMock.mockClear();
  });

  describe('auth', () => {
    it('rejects requests without a token', async () => {
      await request(bundle.app).get('/api/clipboards').expect(401);
    });

    it('rejects invalid tokens', async () => {
      await request(bundle.app)
        .get('/api/clipboards')
        .set({ Authorization: 'Bearer bogus' })
        .expect(401);
    });
  });

  describe('users', () => {
    it('preserves a custom name when a device refreshes its profile', async () => {
      await request(bundle.app).post('/api/users/sync').set(asA).send({ name: 'Custom name' }).expect(201);
      const res = await request(bundle.app).post('/api/users/sync').set(asA).send({}).expect(201);
      expect(res.body.name).toBe('Custom name');
    });

    it('allows only one concurrent writer of a key version', async () => {
      await request(bundle.app).post('/api/users/sync').set(asA).send({}).expect(201);
      const results = await Promise.all([
        request(bundle.app).put('/api/users/me/keys').set(asA).send(VALID_KEYS),
        request(bundle.app).put('/api/users/me/keys').set(asA).send({ ...VALID_KEYS, wrappedKey: 'different' }),
      ]);
      expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    });

    it('rejects key derivation parameters that can exhaust a phone', async () => {
      await request(bundle.app).put('/api/users/me/keys').set(asA)
        .send({ ...VALID_KEYS, kdf: { name: 'scrypt', N: 2 ** 22, r: 32, p: 16 } }).expect(400);
    });
    it('sync takes email from the token, not the body', async () => {
      const res = await request(bundle.app)
        .post('/api/users/sync')
        .set(asA)
        .send({ email: 'spoofed@evil.com', name: 'Alice' })
        .expect(201);
      expect(res.body.email).toBe('a@example.com');
      expect(res.body.name).toBe('Alice');
    });

    it('key storage enforces optimistic version lock', async () => {
      await request(bundle.app).post('/api/users/sync').set(asA).send({}).expect(201);

      // No keys yet
      await request(bundle.app).get('/api/users/me/keys').set(asA).expect(404);

      // Create must claim version 1
      await request(bundle.app).put('/api/users/me/keys').set(asA).send(VALID_KEYS).expect(200);

      // Re-sending version 1 conflicts
      const conflict = await request(bundle.app)
        .put('/api/users/me/keys')
        .set(asA)
        .send(VALID_KEYS)
        .expect(409);
      expect(conflict.body.currentVersion).toBe(1);

      // Version 2 succeeds
      await request(bundle.app)
        .put('/api/users/me/keys')
        .set(asA)
        .send({ ...VALID_KEYS, keyVersion: 2 })
        .expect(200);

      const keys = await request(bundle.app).get('/api/users/me/keys').set(asA).expect(200);
      expect(keys.body.keyVersion).toBe(2);
    });

    it('DELETE /me cascades all user data and deletes the Firebase user', async () => {
      await request(bundle.app).post('/api/users/sync').set(asA).send({}).expect(201);
      await Clipboard.create({ userId: 'user_a', deviceId: 'd1', deviceName: 'D', content: 'x' });
      await Shared.create({ userId: 'user_a', content: 'x', code: 'AAAA' });
      await Device.create({ userId: 'user_a', deviceId: 'd1', deviceName: 'D', os: 'android' });
      // Another user's data must survive
      await Clipboard.create({ userId: 'user_b', deviceId: 'd2', deviceName: 'E', content: 'y' });

      await request(bundle.app).delete('/api/users/me').set(asA).expect(200);

      expect(await Clipboard.countDocuments({ userId: 'user_a' })).toBe(0);
      expect(await Shared.countDocuments({ userId: 'user_a' })).toBe(0);
      expect(await Device.countDocuments({ userId: 'user_a' })).toBe(0);
      expect(await User.countDocuments({ firebaseUid: 'user_a' })).toBe(0);
      expect(await Clipboard.countDocuments({ userId: 'user_b' })).toBe(1);
      expect(deleteUserMock).toHaveBeenCalledWith('user_a');
    });
  });

  describe('devices', () => {
    it('does not let one user take over another user\'s device record', async () => {
      await request(bundle.app)
        .post('/api/devices')
        .set(asA)
        .send({ deviceId: 'shared-id', deviceName: 'A phone', os: 'android' })
        .expect(201);

      await request(bundle.app)
        .post('/api/devices')
        .set(asB)
        .send({ deviceId: 'shared-id', deviceName: 'B phone', os: 'ios' })
        .expect(201);

      const aDevice = await Device.findOne({ deviceId: 'shared-id', userId: 'user_a' });
      expect(aDevice?.deviceName).toBe('A phone'); // untouched by B's upsert
      expect(await Device.countDocuments({ deviceId: 'shared-id' })).toBe(2);
    });
  });

  describe('clipboards', () => {
    it('rejects old-key clipboard and share writes after an encryption reset', async () => {
      const oldId = '11111111-1111-4111-8111-111111111111';
      const newId = '22222222-2222-4222-8222-222222222222';
      await request(bundle.app).post('/api/users/sync').set(asA).send({}).expect(201);
      await request(bundle.app).put('/api/users/me/keys').set(asA).send({ ...VALID_KEYS, keyId: oldId }).expect(200);
      const clip = { deviceId: 'd', deviceName: 'D', content: 'ciphertext', keyId: oldId };
      await request(bundle.app).post('/api/clipboards').set(asA).send(clip).expect(201);
      await request(bundle.app).delete('/api/users/me/keys').set(asA).expect(200);
      await request(bundle.app).post('/api/clipboards').set(asA).send(clip).expect(412);
      await request(bundle.app).put('/api/users/me/keys').set(asA).send({ ...VALID_KEYS, keyId: newId }).expect(200);
      await request(bundle.app).post('/api/clipboards').set(asA).send(clip).expect(412);
      await request(bundle.app).post('/api/shared').set(asA)
        .send({ code: 'AAAA', content: 'ciphertext', keyId: oldId }).expect(412);
      expect(await Clipboard.countDocuments()).toBe(0);
      expect(await Shared.countDocuments()).toBe(0);
      await request(bundle.app).post('/api/clipboards').set(asA).send({ ...clip, keyId: newId }).expect(201);
    });

    it('accepts an explicit legacy key precondition only while legacy keys exist', async () => {
      const clip = { deviceId: 'd', deviceName: 'D', content: 'ciphertext', keyId: null };
      await request(bundle.app).post('/api/clipboards').set(asA).send(clip).expect(412);
      await request(bundle.app).post('/api/users/sync').set(asA).send({}).expect(201);
      await request(bundle.app).put('/api/users/me/keys').set(asA).send(VALID_KEYS).expect(200);
      await request(bundle.app).post('/api/clipboards').set(asA).send(clip).expect(201);
    });

    it('retries a lost create response without creating duplicate clips', async () => {
      const payload = { deviceId: 'd', deviceName: 'Phone', content: 'encrypted', requestId: '11111111-1111-4111-8111-111111111111' };
      const results = await Promise.all([
        request(bundle.app).post('/api/clipboards').set(asA).send(payload).expect(201),
        request(bundle.app).post('/api/clipboards').set(asA).send(payload).expect(201),
      ]);
      expect(results[0].body._id).toBe(results[1].body._id);
      expect(await Clipboard.countDocuments({ userId: 'user_a' })).toBe(1);
    });

    it('returns a validation error for malformed IDs', async () => {
      await request(bundle.app).delete('/api/clipboards/not-an-id').set(asA).expect(400);
      await request(bundle.app).delete('/api/shared/not-an-id').set(asA).expect(400);
    });

    it('prevents sensitive API responses from being cached', async () => {
      const res = await request(bundle.app).get('/api/clipboards').set(asA).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
    });
    it('scopes reads and deletes to the owner', async () => {
      const clipA = await Clipboard.create({ userId: 'user_a', deviceId: 'd', deviceName: 'D', content: 'secret-a' });
      await Clipboard.create({ userId: 'user_b', deviceId: 'd', deviceName: 'D', content: 'secret-b' });

      const listB = await request(bundle.app).get('/api/clipboards').set(asB).expect(200);
      expect(listB.body).toHaveLength(1);
      expect(listB.body[0].content).toBe('secret-b');

      // B cannot delete A's entry
      await request(bundle.app).delete(`/api/clipboards/${clipA._id}`).set(asB).expect(404);
      expect(await Clipboard.countDocuments({ userId: 'user_a' })).toBe(1);
    });

    it('clamps the limit query', async () => {
      await Clipboard.create({ userId: 'user_a', deviceId: 'd', deviceName: 'D', content: 'x' });
      await request(bundle.app).get('/api/clipboards?limit=100000000').set(asA).expect(200);
      await request(bundle.app).get('/api/clipboards?limit=-5').set(asA).expect(200);
    });

    it('rejects oversized content', async () => {
      // Over the 200k content limit but under the JSON body cap → zod 400
      await request(bundle.app)
        .post('/api/clipboards')
        .set(asA)
        .send({ deviceId: 'd', deviceName: 'D', content: 'x'.repeat(250_000) })
        .expect(400);

      // Over the 256kb JSON body cap → 413 before validation
      await request(bundle.app)
        .post('/api/clipboards')
        .set(asA)
        .send({ deviceId: 'd', deviceName: 'D', content: 'x'.repeat(300_000) })
        .expect(413);
    });
  });

  describe('shared links', () => {
    const create = (headers: Record<string, string>, code: string, extra: object = {}) =>
      request(bundle.app)
        .post('/api/shared')
        .set(headers)
        .send({ content: 'ciphertext-blob', code, ...extra });

    it('stores the client-supplied code and 409s on collisions', async () => {
      await create(asA, 'AB12').expect(201);
      await create(asB, 'AB12').expect(409);
    });

    it('creates an encrypted anonymous share without an account identity', async () => {
      const res = await request(bundle.app)
        .post('/api/shared/anonymous')
        .send({ content: 'encrypted-envelope', code: 'A7K2', ttlDays: 1 })
        .expect(201);
      expect(res.body.code).toBe('A7K2');
      expect(res.body.userId).toBeUndefined();
      const stored = await Shared.findOne({ code: 'A7K2' });
      expect(stored?.content).toBe('encrypted-envelope');
      expect(stored?.userId).toBeUndefined();
    });

    it('rejects oversized expiry for anonymous shares', async () => {
      await request(bundle.app)
        .post('/api/shared/anonymous')
        .send({ content: 'encrypted-envelope', code: 'W7K2', ttlDays: 30 })
        .expect(400);
    });

    it('rejects malformed codes', async () => {
      await create(asA, 'ABC').expect(400);
      await create(asA, 'ab12').expect(400);
      await create(asA, 'AB-2').expect(400);
    });

    it('public lookup returns only content/dates — never userId', async () => {
      await create(asA, 'AB12').expect(201);
      const res = await request(bundle.app).get('/api/shared/AB12').expect(200);
      expect(res.body.content).toBe('ciphertext-blob');
      expect(res.body.userId).toBeUndefined();
      expect(res.body._id).toBeUndefined();
      expect(res.body.expiryAt).toBeDefined();
    });

    it('continues resolving legacy 8-character references', async () => {
      await Shared.create({
        userId: 'user_a',
        content: 'legacy-ciphertext',
        code: 'AbCdEfGh',
        expiryAt: new Date(Date.now() + 60_000),
      });
      const res = await request(bundle.app).get('/api/shared/AbCdEfGh').expect(200);
      expect(res.body.content).toBe('legacy-ciphertext');
    });

    it('expired links are not returned', async () => {
      await Shared.create({
        userId: 'user_a',
        content: 'old',
        code: 'XP9D',
        expiryAt: new Date(Date.now() - 1000),
      });
      await request(bundle.app).get('/api/shared/XP9D').expect(404);

      const list = await request(bundle.app).get('/api/shared').set(asA).expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('delete-all removes only the caller\'s links', async () => {
      await create(asA, 'AAAA').expect(201);
      await create(asA, 'BBBB').expect(201);
      await create(asB, 'CCCC').expect(201);

      await request(bundle.app).delete('/api/shared').set(asA).expect(200);
      expect(await Shared.countDocuments({ userId: 'user_a' })).toBe(0);
      expect(await Shared.countDocuments({ userId: 'user_b' })).toBe(1);
    });

    // Keep last: exhausts the public lookup rate limit for this IP.
    it('rate limits the public lookup route', async () => {
      await create(asA, 'R8LT').expect(201);
      let lastStatus = 200;
      for (let i = 0; i < 25; i++) {
        const res = await request(bundle.app).get('/api/shared/R8LT');
        lastStatus = res.status;
        if (lastStatus === 429) break;
      }
      expect(lastStatus).toBe(429);
    });
  });
});
