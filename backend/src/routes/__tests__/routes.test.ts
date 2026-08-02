import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp, AppBundle } from '../../app';
import User from '../../models/User';
import Device from '../../models/Device';
import Clipboard from '../../models/Clipboard';
import Shared from '../../models/Shared';

const deleteUserMock = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase-admin', () => {
  return {
    apps: [{}], // non-empty so lazy init skips initializeApp
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn((token: string) => {
        if (token === 'token_a') {
          return Promise.resolve({ uid: 'user_a', email: 'a@example.com' });
        }
        if (token === 'token_b') {
          return Promise.resolve({ uid: 'user_b', email: 'b@example.com' });
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
      await Shared.create({ userId: 'user_a', content: 'x', code: 'AAAAAAAA' });
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
      await create(asA, 'AbCdEfGh').expect(201);
      await create(asB, 'AbCdEfGh').expect(409);
    });

    it('rejects malformed codes', async () => {
      await create(asA, 'short').expect(400);
      await create(asA, 'has 0 l!').expect(400);
    });

    it('public lookup returns only content/dates — never userId', async () => {
      await create(asA, 'AbCdEfGh').expect(201);
      const res = await request(bundle.app).get('/api/shared/AbCdEfGh').expect(200);
      expect(res.body.content).toBe('ciphertext-blob');
      expect(res.body.userId).toBeUndefined();
      expect(res.body._id).toBeUndefined();
      expect(res.body.expiryAt).toBeDefined();
    });

    it('expired links are not returned', async () => {
      await Shared.create({
        userId: 'user_a',
        content: 'old',
        code: 'ExPiReDx',
        expiryAt: new Date(Date.now() - 1000),
      });
      await request(bundle.app).get('/api/shared/ExPiReDx').expect(404);

      const list = await request(bundle.app).get('/api/shared').set(asA).expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('delete-all removes only the caller\'s links', async () => {
      await create(asA, 'AAAAAAAA').expect(201);
      await create(asA, 'BBBBBBBB').expect(201);
      await create(asB, 'CCCCCCCC').expect(201);

      await request(bundle.app).delete('/api/shared').set(asA).expect(200);
      expect(await Shared.countDocuments({ userId: 'user_a' })).toBe(0);
      expect(await Shared.countDocuments({ userId: 'user_b' })).toBe(1);
    });

    // Keep last: exhausts the public lookup rate limit for this IP.
    it('rate limits the public lookup route', async () => {
      await create(asA, 'RateLimT').expect(201);
      let lastStatus = 200;
      for (let i = 0; i < 25; i++) {
        const res = await request(bundle.app).get('/api/shared/RateLimT');
        lastStatus = res.status;
        if (lastStatus === 429) break;
      }
      expect(lastStatus).toBe(429);
    });
  });
});
