import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { getFirebaseAuth } from '../middleware/auth';
import Clipboard from '../models/Clipboard';

type Ack = (response: { ok: boolean; error?: string; clipboard?: unknown; id?: string }) => void;

const createSchema = z.object({
  deviceId: z.string().min(1).max(256),
  deviceName: z.string().min(1).max(256),
  // E2E envelope — opaque to the server.
  content: z.string().min(1).max(200_000),
});

const deleteSchema = z.object({
  id: z.string().min(1).max(64),
});

// Authenticate socket connection
export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decodedToken = await getFirebaseAuth().verifyIdToken(token);
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

  // Handle new clipboard entry
  socket.on('clipboard:create', async (data, ack?: Ack) => {
    try {
      const parsed = createSchema.safeParse(data);
      if (!parsed.success) {
        const message = 'Invalid clipboard entry';
        ack?.({ ok: false, error: message });
        socket.emit('error', { message });
        return;
      }
      const { deviceId, deviceName, content } = parsed.data;

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
      ack?.({ ok: true, clipboard });
    } catch (error) {
      ack?.({ ok: false, error: 'Failed to create clipboard entry' });
      socket.emit('error', { message: 'Failed to create clipboard entry' });
    }
  });

  // Handle clipboard deletion
  socket.on('clipboard:delete', async (data, ack?: Ack) => {
    try {
      const parsed = deleteSchema.safeParse(data);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'Invalid delete request' });
        return;
      }
      const { id } = parsed.data;
      await Clipboard.findOneAndDelete({ _id: id, userId });
      // Broadcast deletion
      socket.to(`user:${userId}`).emit('clipboard:deleted', { id });
      ack?.({ ok: true, id });
    } catch (error) {
      ack?.({ ok: false, error: 'Failed to delete clipboard entry' });
      socket.emit('error', { message: 'Failed to delete clipboard entry' });
    }
  });

  // Handle clear all
  socket.on('clipboard:clearAll', async (ack?: Ack) => {
    try {
      await Clipboard.deleteMany({ userId });
      socket.to(`user:${userId}`).emit('clipboard:cleared');
      if (typeof ack === 'function') ack({ ok: true });
    } catch (error) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Failed to clear clipboards' });
      socket.emit('error', { message: 'Failed to clear clipboards' });
    }
  });
};
