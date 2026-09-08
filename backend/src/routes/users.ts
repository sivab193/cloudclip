import express from 'express';
import { mutation } from '../middleware/mutation';
import { z } from 'zod';
import { verifyFirebaseToken, getFirebaseAuth, requireRecentLogin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import User from '../models/User';
import Device from '../models/Device';
import Clipboard from '../models/Clipboard';
import Shared from '../models/Shared';

const router = express.Router();

// Get the current user profile
router.get('/me', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

const syncSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
}).loose();

// Create or sync user profile. Email always comes from the verified token —
// the client cannot set it. Name is user-editable.
router.post('/sync', verifyFirebaseToken, validate(syncSchema), mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const email = req.user?.email;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'Token has no email identity' });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $set: { email, ...(req.body.name ? { name: req.body.name } : {}) },
        $setOnInsert: { firebaseUid, ...(!req.body.name ? { name: email.split('@')[0] } : {}) },
      },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}));

// ---- E2E key storage -------------------------------------------------------
// The server stores the user's master key only in wrapped (encrypted) form;
// it can never decrypt clipboard content.

router.get('/me/keys', verifyFirebaseToken, async (req, res, next) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user?.uid });
    if (!user?.encryption) {
      return res.status(404).json({ error: 'No encryption keys set up' });
    }
    res.json(user.encryption);
  } catch (error) {
    next(error);
  }
});

const kdfSchema = z.object({
  name: z.literal('scrypt'),
  N: z.union([z.literal(32768), z.literal(65536)]),
  r: z.literal(8),
  p: z.literal(1),
});
const keysSchema = z.object({
  keyId: z.uuid().optional(),
  recoveryKdf: kdfSchema.optional(),
  wrappedKey: z.string().min(1).max(512),
  wrapNonce: z.string().min(1).max(64),
  salt: z.string().min(1).max(128),
  kdf: kdfSchema,
  recoveryWrappedKey: z.string().min(1).max(512).optional(),
  recoveryNonce: z.string().min(1).max(64).optional(),
  recoverySalt: z.string().min(1).max(128).optional(),
  keyVersion: z.number().int().min(1),
});

router.put('/me/keys', verifyFirebaseToken, validate(keysSchema), mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ error: 'User not found; call /sync first' });
    }

    // Optimistic lock: creation must claim version 1, updates must supply
    // current+1. Prevents two devices from silently clobbering a re-wrap.
    const currentVersion = user.encryption?.keyVersion ?? 0;
    if (req.body.keyVersion !== currentVersion + 1) {
      return res.status(409).json({
        error: 'Key version conflict',
        currentVersion,
      });
    }

    if (user.encryption?.keyId && req.body.keyId !== user.encryption.keyId) {
      return res.status(400).json({ error: 'Reset encrypted data before replacing the master key' });
    }
    const updated = await User.findOneAndUpdate(
      { firebaseUid, ...(currentVersion === 0
        ? { encryption: { $exists: false } }
        : { 'encryption.keyVersion': currentVersion }) },
      { $set: { encryption: req.body } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) return res.status(409).json({ error: 'Key version conflict' });
    res.json(updated.encryption);
  } catch (error) {
    next(error);
  }
}));

// Reset encryption: removes the wrapped keys AND all encrypted data (which is
// unreadable without the old master key anyway).
router.delete('/me/keys', verifyFirebaseToken, requireRecentLogin, mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    await Promise.all([
      Clipboard.deleteMany({ userId: firebaseUid }),
      Shared.deleteMany({ userId: firebaseUid }),
    ]);
    await User.updateOne({ firebaseUid }, { $unset: { encryption: 1 } });
    req.app.get('io').to(`user:${firebaseUid}`).emit('encryption:reset');
    req.app.get('io').to(`user:${firebaseUid}`).emit('clipboard:cleared');
    res.json({ message: 'Encryption keys and encrypted data removed' });
  } catch (error) {
    next(error);
  }
}));

// ---- Account deletion (required by Play & App Store policies) --------------

router.delete('/me', verifyFirebaseToken, requireRecentLogin, mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Stop live streams before removing data. Mutations queued for this user
    // re-check Firebase revocation after this operation releases the lock.
    req.app.get('io').in(`user:${firebaseUid}`).disconnectSockets(true);
    await Promise.all([
      Clipboard.deleteMany({ userId: firebaseUid }),
      Shared.deleteMany({ userId: firebaseUid }),
      Device.deleteMany({ userId: firebaseUid }),
      User.deleteOne({ firebaseUid }),
    ]);

    // Firebase deletion last: if it fails the client can retry — the Mongo
    // cascade above is idempotent.
    await getFirebaseAuth().deleteUser(firebaseUid);

    res.json({ message: 'Account and all data deleted' });
  } catch (error) {
    next(error);
  }
}));

export default router;
