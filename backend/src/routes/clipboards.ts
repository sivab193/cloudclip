import express from 'express';
import { z } from 'zod';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Clipboard from '../models/Clipboard';

const router = express.Router();

// Get recent clipboard entries for the current user
router.get('/', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const requested = parseInt(req.query.limit as string, 10);
    const limit = Math.min(Math.max(Number.isNaN(requested) ? 50 : requested, 1), 100);

    const clipboards = await Clipboard.find({ userId: firebaseUid })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(clipboards);
  } catch (error) {
    next(error);
  }
});

const createSchema = z.object({
  deviceId: z.string().min(1).max(256),
  deviceName: z.string().min(1).max(256),
  // E2E envelope — opaque to the server.
  content: z.string().min(1).max(200_000),
});

// Create a new clipboard entry (REST fallback; real-time path is Socket.io)
router.post('/', verifyFirebaseToken, validate(createSchema), async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { deviceId, deviceName, content } = req.body;

    const clipboard = new Clipboard({
      userId: firebaseUid,
      deviceId,
      deviceName,
      content
    });

    await clipboard.save();

    res.status(201).json(clipboard);
  } catch (error) {
    next(error);
  }
});

// Delete a single clipboard entry
router.delete('/:id', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { id } = req.params;

    const result = await Clipboard.findOneAndDelete({
      _id: id,
      userId: firebaseUid
    });

    if (!result) {
      return res.status(404).json({ error: 'Clipboard entry not found or unauthorized' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete all clipboard entries for user
router.delete('/', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    await Clipboard.deleteMany({ userId: firebaseUid });
    res.json({ message: 'All clipboard entries deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
