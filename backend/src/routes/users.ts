import express from 'express';
import { z } from 'zod';
import { verifyFirebaseToken, getFirebaseAuth } from '../middleware/auth';
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
router.post('/sync', verifyFirebaseToken, validate(syncSchema), async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const email = req.user?.email;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'Token has no email identity' });
    }

    const name = req.body.name || email.split('@')[0];

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { firebaseUid, email, name },
      { new: true, upsert: true }
    );

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

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

const keysSchema = z.object({
  wrappedKey: z.string().min(1).max(512),
  wrapNonce: z.string().min(1).max(64),
  salt: z.string().min(1).max(128),
  kdf: z.object({
    name: z.literal('scrypt'),
    // Floor is the weakest N any shipped client ever wrote (2^15), so a
    // modified or downgraded client cannot persist a cheap-to-crack record.
    N: z.number().int().min(32768).max(2 ** 22),
    r: z.number().int().min(1).max(32),
    p: z.number().int().min(1).max(16),
  }),
  recoveryWrappedKey: z.string().min(1).max(512).optional(),
  recoveryNonce: z.string().min(1).max(64).optional(),
  recoverySalt: z.string().min(1).max(128).optional(),
  keyVersion: z.number().int().min(1),
});

router.put('/me/keys', verifyFirebaseToken, validate(keysSchema), async (req, res, next) => {
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

    user.encryption = req.body;
    await user.save();
    res.json(user.encryption);
  } catch (error) {
    next(error);
  }
});

// Reset encryption: removes the wrapped keys AND all encrypted data (which is
// unreadable without the old master key anyway).
router.delete('/me/keys', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    await Promise.all([
      Clipboard.deleteMany({ userId: firebaseUid }),
      Shared.deleteMany({ userId: firebaseUid }),
    ]);
    await User.updateOne({ firebaseUid }, { $unset: { encryption: 1 } });
    res.json({ message: 'Encryption keys and encrypted data removed' });
  } catch (error) {
    next(error);
  }
});

// ---- Account deletion (required by Play & App Store policies) --------------

router.delete('/me', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
});

export default router;
