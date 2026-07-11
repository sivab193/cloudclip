import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth';
import Device from '../models/Device';

const router = express.Router();

// Get all devices for the current user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const devices = await Device.find({ userId: firebaseUid }).sort({ createdAt: -1 });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Register or update a device
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { deviceId, deviceName, os } = req.body;
    
    if (!deviceId || !deviceName || !os) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const device = await Device.findOneAndUpdate(
      { deviceId },
      { 
        deviceId, 
        userId: firebaseUid, 
        deviceName, 
        os,
        sync: true 
      },
      { new: true, upsert: true }
    );
    
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a device
router.delete('/:deviceId', verifyFirebaseToken, async (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
