import express from 'express';
import { verifyFirebaseToken } from '../middleware/auth';
import Shared from '../models/Shared';
import { nanoid } from 'nanoid';

const router = express.Router();

// Get shared links for the current user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const shared = await Shared.find({ userId: firebaseUid }).sort({ createdAt: -1 });
    res.json(shared);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new shared link
router.post('/', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { content, clipboardId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Missing required field: content' });
    }
    
    const code = nanoid(6); // Generate 6-char shortcode
    
    const shared = new Shared({
      userId: firebaseUid,
      content,
      clipboardId,
      code
    });
    
    await shared.save();
    res.status(201).json(shared);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a shared link by code (PUBLIC route - no auth required)
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const shared = await Shared.findOne({ code });
    
    if (!shared) {
      return res.status(404).json({ error: 'Shared link not found' });
    }
    
    res.json(shared);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a shared link
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { id } = req.params;
    
    const result = await Shared.findOneAndDelete({ 
      _id: id, 
      userId: firebaseUid 
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Shared link not found or unauthorized' });
    }
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
