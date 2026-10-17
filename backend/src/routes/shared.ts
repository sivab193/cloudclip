import express from 'express';
import { mutation } from '../middleware/mutation';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Shared from '../models/Shared';
import { objectIdSchema } from '../services/clipboard';
import { assertEncryptionKey } from '../services/encryption';

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

// Get shared links for the current user
router.get('/', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    // TTL deletion can lag ~60s behind expiry, so filter here too.
    const shared = await Shared.find({ userId: firebaseUid, expiryAt: { $gt: new Date() } })
      .sort({ createdAt: -1 });
    res.json(shared);
  } catch (error) {
    next(error);
  }
});

const createSchema = z.object({
  // E2E envelope — opaque to the server.
  content: z.string().min(1).max(200_000),
  // Client-generated lookup code: the first 8 chars of the share token. The
  // decryption key is derived from the full token, which never reaches us.
  code: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{8}$/, 'code must be 8 base58 characters'),
  ownerWrappedKey: z.string().min(1).max(512).optional(),
  ownerWrapNonce: z.string().min(1).max(64).optional(),
  clipboardId: z.string().max(64).optional(),
  ttlDays: z.number().int().min(1).max(30).default(7),
  keyId: z.uuid().nullable().optional(),
});

const anonymousCreateSchema = createSchema.pick({ content: true, code: true }).extend({
  ttlDays: z.number().int().min(1).max(7).default(1),
});

const anonymousCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Create an account-free encrypted share. The server receives only ciphertext
// and the public lookup prefix; the full decryption token stays in the URL hash.
router.post('/anonymous', anonymousCreateLimiter, validate(anonymousCreateSchema), async (req, res, next) => {
  try {
    const { content, code, ttlDays } = req.body;
    const shared = new Shared({
      content,
      code,
      expiryAt: new Date(Date.now() + ttlDays * DAY_MS),
    });
    await shared.save();
    res.status(201).json({
      code: shared.code,
      createdAt: shared.createdAt,
      expiryAt: shared.expiryAt,
    });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Code already in use' });
    next(error);
  }
});

// Create a new shared link
router.post('/', verifyFirebaseToken, validate(createSchema), mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { content, code, ownerWrappedKey, ownerWrapNonce, clipboardId, ttlDays } = req.body;
    await assertEncryptionKey(firebaseUid!, req.body.keyId);

    const shared = new Shared({
      userId: firebaseUid,
      content,
      clipboardId,
      code,
      ownerWrappedKey,
      ownerWrapNonce,
      expiryAt: new Date(Date.now() + ttlDays * DAY_MS),
    });

    await shared.save();
    res.status(201).json(shared);
  } catch (error: any) {
    if (error?.code === 11000) {
      // Code collision — client regenerates its token and retries.
      return res.status(409).json({ error: 'Code already in use' });
    }
    next(error);
  }
}));

// Delete ALL shared links for the current user
router.delete('/', verifyFirebaseToken, mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    await Shared.deleteMany({ userId: firebaseUid });
    res.json({ message: 'All shared links deleted' });
  } catch (error) {
    next(error);
  }
}));

// Brute-forcing codes only yields ciphertext (E2E), but throttle anyway.
const publicLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Get a shared link by code (PUBLIC route - no auth required)
router.get('/:code', publicLookupLimiter, async (req, res, next) => {
  try {
    const { code } = req.params;
    if (typeof code !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{8}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid share code' });
    }
    const shared = await Shared.findOne({ code, expiryAt: { $gt: new Date() } });

    if (!shared) {
      return res.status(404).json({ error: 'Shared link not found' });
    }

    // Never leak owner identity on the public route.
    res.json({
      content: shared.content,
      createdAt: shared.createdAt,
      expiryAt: shared.expiryAt,
    });
  } catch (error) {
    next(error);
  }
});

// Delete a shared link
router.delete('/:id', verifyFirebaseToken, mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { id } = req.params;
    if (!objectIdSchema.safeParse(id).success) return res.status(400).json({ error: 'Invalid shared link ID' });

    const result = await Shared.findOneAndDelete({
      _id: id,
      userId: firebaseUid
    });

    if (!result) {
      return res.status(404).json({ error: 'Shared link not found or unauthorized' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
}));

export default router;
