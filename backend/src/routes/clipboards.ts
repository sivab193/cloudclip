import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth';
import Clipboard from '../models/Clipboard';

const router = express.Router();

// Get recent clipboard entries for the current user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const clipboards = await Clipboard.find({ userId: firebaseUid })
      .sort({ createdAt: -1 })
      .limit(limit);
      
    res.json(clipboards);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new clipboard entry (Note: Often triggered via Socket.io instead for RT sync, but good to have REST fallback)
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { deviceId, deviceName, content } = req.body;
    
    if (!deviceId || !deviceName || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const clipboard = new Clipboard({
      userId: firebaseUid,
      deviceId,
      deviceName,
      content
    });
    
    await clipboard.save();
    
    res.status(201).json(clipboard);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a single clipboard entry
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all clipboard entries for user
router.delete('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    await Clipboard.deleteMany({ userId: firebaseUid });
    res.json({ message: 'All clipboard entries deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
