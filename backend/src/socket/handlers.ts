import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import Clipboard from '../models/Clipboard';

// Authenticate socket connection
export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // In production, uncomment this and pass real tokens
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.data.user = decodedToken;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.user?.uid;
  
  if (!userId) return;

  // The crucial part: user joins a room specific to their UID
  // This allows us to broadcast to ONLY their devices
  socket.join(`user:${userId}`);
  console.log(`Socket ${socket.id} joined room user:${userId}`);

  // Handle new clipboard entry
  socket.on('clipboard:create', async (data) => {
    try {
      const { deviceId, deviceName, content } = data;
      
      // 1. Save to DB
      const clipboard = new Clipboard({
        userId,
        deviceId,
        deviceName,
        content
      });
      await clipboard.save();
      
      // 2. Broadcast to all OTHER devices in the user's room
      socket.to(`user:${userId}`).emit('clipboard:new', clipboard);
      
      // 3. Acknowledge back to sender
      socket.emit('clipboard:created', clipboard);
    } catch (error) {
      socket.emit('error', { message: 'Failed to create clipboard entry' });
    }
  });

  // Handle clipboard deletion
  socket.on('clipboard:delete', async ({ id }) => {
    try {
      await Clipboard.findOneAndDelete({ _id: id, userId });
      // Broadcast deletion
      socket.to(`user:${userId}`).emit('clipboard:deleted', { id });
    } catch (error) {
      socket.emit('error', { message: 'Failed to delete clipboard entry' });
    }
  });

  // Handle clear all
  socket.on('clipboard:clearAll', async () => {
    try {
      await Clipboard.deleteMany({ userId });
      socket.to(`user:${userId}`).emit('clipboard:cleared');
    } catch (error) {
      socket.emit('error', { message: 'Failed to clear clipboards' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);
  });
};
