import express from 'express';
import { mutation } from '../middleware/mutation';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Shared from '../models/Shared';
import { objectIdSchema } from '../services/clipboard';
import { assertEncryptionKey } from '../services/encryption';
import { openShareToken, sealShareToken } from '../services/shareToken';

const router = express.Router();

const MINUTE_MS = 60 * 1000;
const DEFAULT_TTL_MINUTES = 24 * 60;
const MAX_ANONYMOUS_TTL_MINUTES = 7 * 24 * 60;
const MAX_ACCOUNT_TTL_MINUTES = 30 * 24 * 60;

const ttlMinutesSchema = (maximum: number) => z.number().int().min(10).max(maximum);
const expiryFromNow = (ttlMinutes: number) => new Date(Date.now() + ttlMinutes * MINUTE_MS);
const requestedTtlMinutes = (body: { ttlMinutes?: number; ttlDays?: number }, maximum: number) =>
  Math.min(body.ttlMinutes ?? (body.ttlDays ? body.ttlDays * 24 * 60 : DEFAULT_TTL_MINUTES), maximum);

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
  // Client-encrypted envelope stored encrypted at rest.
  content: z.string().min(1).max(200_000),
  // Client-generated reference: the first 4 chars of the share token.
  code: z.string().regex(/^[A-Z0-9]{4}$/, 'code must be 4 uppercase alphanumeric characters'),
  token: z.string().regex(/^[A-Z0-9]{4}0[1-9A-HJ-NP-Za-km-z]{27}$/, 'invalid share token').optional(),
  ownerWrappedKey: z.string().min(1).max(512).optional(),
  ownerWrapNonce: z.string().min(1).max(64).optional(),
  clipboardId: z.string().max(64).optional(),
  ttlMinutes: ttlMinutesSchema(MAX_ACCOUNT_TTL_MINUTES).optional(),
  // Accepted temporarily so already-installed clients keep working through rollout.
  ttlDays: z.number().int().min(1).max(30).optional(),
  keyId: z.uuid().nullable().optional(),
});

const anonymousCreateSchema = createSchema.pick({ content: true, code: true, token: true }).extend({
  ttlMinutes: ttlMinutesSchema(MAX_ANONYMOUS_TTL_MINUTES).optional(),
  ttlDays: z.number().int().min(1).max(7).optional(),
});

const updateExpirySchema = z.object({
  ttlMinutes: ttlMinutesSchema(MAX_ACCOUNT_TTL_MINUTES),
});

const anonymousCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Create an account-free encrypted share. The token is encrypted before it is
// stored so the four-character code can retrieve it without plaintext at rest.
router.post('/anonymous', anonymousCreateLimiter, validate(anonymousCreateSchema), async (req, res, next) => {
  try {
    const { content, code, token } = req.body;
    if (token && !token.startsWith(`${code}0`)) return res.status(400).json({ error: 'Share token does not match code' });
    const shared = new Shared({
      content,
      code,
      serverWrappedToken: token ? sealShareToken(token) : undefined,
      expiryAt: expiryFromNow(requestedTtlMinutes(req.body, MAX_ANONYMOUS_TTL_MINUTES)),
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
    const { content, code, token, ownerWrappedKey, ownerWrapNonce, clipboardId } = req.body;
    if (token && !token.startsWith(`${code}0`)) return res.status(400).json({ error: 'Share token does not match code' });
    await assertEncryptionKey(firebaseUid!, req.body.keyId);

    const shared = new Shared({
      userId: firebaseUid,
      content,
      clipboardId,
      code,
      serverWrappedToken: token ? sealShareToken(token) : undefined,
      ownerWrappedKey,
      ownerWrapNonce,
      expiryAt: expiryFromNow(requestedTtlMinutes(req.body, MAX_ACCOUNT_TTL_MINUTES)),
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

// Signed-in owners may reset an active link's expiry from the current time.
router.patch('/:id/expiry', verifyFirebaseToken, validate(updateExpirySchema), mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { id } = req.params;
    if (!objectIdSchema.safeParse(id).success) return res.status(400).json({ error: 'Invalid shared link ID' });

    const shared = await Shared.findOneAndUpdate(
      { _id: id, userId: firebaseUid, expiryAt: { $gt: new Date() } },
      { $set: { expiryAt: expiryFromNow(req.body.ttlMinutes) } },
      { returnDocument: 'after' },
    );
    if (!shared) return res.status(404).json({ error: 'Shared link not found, expired, or unauthorized' });
    res.json(shared);
  } catch (error) {
    next(error);
  }
}));

// The short code is intentionally easy to type, so public lookup is tightly
// throttled. Successful responses contain the per-share key required to open it.
const publicLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Get a shared link by code (PUBLIC route - no auth required)
router.get('/:code', publicLookupLimiter, async (req, res, next) => {
  try {
    const { code } = req.params;
    // Eight-character base58 references remain readable for links created
    // before the four-character format was introduced.
    if (typeof code !== 'string' || !(/^([A-Z0-9]{4}|[1-9A-HJ-NP-Za-km-z]{8})$/.test(code))) {
      return res.status(400).json({ error: 'Invalid share code' });
    }
    const shared = await Shared.findOne({ code, expiryAt: { $gt: new Date() } }).select('+serverWrappedToken');

    if (!shared) {
      return res.status(404).json({ error: 'Shared link not found' });
    }

    // Never leak owner identity on the public route. Existing shares created
    // before code-only access have no wrapped token and still require their
    // original complete link.
    res.json({
      content: shared.content,
      token: shared.serverWrappedToken ? openShareToken(shared.serverWrappedToken) : undefined,
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
