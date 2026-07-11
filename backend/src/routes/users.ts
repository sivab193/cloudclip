import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth';
import User from '../models/User';

const router = express.Router();

// Get the current user profile
router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or sync user profile
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { email, name } = req.body;
    
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find or create user
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { firebaseUid, email, name },
      { new: true, upsert: true }
    );
    
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
