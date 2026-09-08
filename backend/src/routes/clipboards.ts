import express from 'express';
import { mutation } from '../middleware/mutation';
import { createClipboard, createClipboardSchema, objectIdSchema } from '../services/clipboard';
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

// Durable write, followed by a notification to every owner device.
router.post('/', verifyFirebaseToken, validate(createClipboardSchema), mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const clipboard = await createClipboard(firebaseUid!, req.body);
    req.app.get('io').to(`user:${firebaseUid}`).emit('clipboard:new', clipboard);

    res.status(201).json(clipboard);
  } catch (error) {
    next(error);
  }
}));

// Delete a single clipboard entry
router.delete('/:id', verifyFirebaseToken, mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { id } = req.params;
    if (!objectIdSchema.safeParse(id).success) return res.status(400).json({ error: 'Invalid clipboard ID' });

    const result = await Clipboard.findOneAndDelete({
      _id: id,
      userId: firebaseUid
    });

    if (!result) {
      return res.status(404).json({ error: 'Clipboard entry not found or unauthorized' });
    }

    req.app.get('io').to(`user:${firebaseUid}`).emit('clipboard:deleted', { id });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
}));

// Delete all clipboard entries for user
router.delete('/', verifyFirebaseToken, mutation(async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    await Clipboard.deleteMany({ userId: firebaseUid });
    req.app.get('io').to(`user:${firebaseUid}`).emit('clipboard:cleared');
    res.json({ message: 'All clipboard entries deleted successfully' });
  } catch (error) {
    next(error);
  }
}));

export default router;
