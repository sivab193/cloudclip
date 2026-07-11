import express from 'express';
import { z } from 'zod';
import { verifyFirebaseToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Device from '../models/Device';

const router = express.Router();

// Get all devices for the current user
router.get('/', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const devices = await Device.find({ userId: firebaseUid }).sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    next(error);
  }
});

const registerSchema = z.object({
  deviceId: z.string().min(1).max(256),
  deviceName: z.string().min(1).max(256),
  os: z.string().min(1).max(64),
});

// Register or update a device. Upsert is scoped to the calling user — the
// same deviceId under another account is a different record, never a takeover.
router.post('/', verifyFirebaseToken, validate(registerSchema), async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { deviceId, deviceName, os } = req.body;

    const device = await Device.findOneAndUpdate(
      { deviceId, userId: firebaseUid },
      {
        $set: { deviceName, os },
        $setOnInsert: { sync: true },
      },
      { new: true, upsert: true }
    );

    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
});

// Delete a device
router.delete('/:deviceId', verifyFirebaseToken, async (req, res, next) => {
  try {
    const firebaseUid = req.user?.uid;
    const { deviceId } = req.params;

    const result = await Device.findOneAndDelete({
      deviceId,
      userId: firebaseUid
    });

    if (!result) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
