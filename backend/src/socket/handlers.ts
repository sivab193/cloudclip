import { Server, Socket } from 'socket.io';
import { getFirebaseAuth } from '../middleware/auth';
import { withUserLock } from '../services/userLock';
import { createClipboard, createClipboardSchema, objectIdSchema } from '../services/clipboard';
import Clipboard from '../models/Clipboard';

type Ack = (response: { ok: boolean; error?: string; clipboard?: unknown; id?: string }) => void;

export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    if (typeof token !== 'string' || !token) return next(new Error('Authentication error: No token provided'));
    socket.data.user = await getFirebaseAuth().verifyIdToken(token, true);
    next();
  } catch {
    next(new Error('Authentication error: Invalid token'));
  }
};

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.user?.uid;
  if (!userId) return;
  const room = `user:${userId}`;
  socket.join(room);

  // Refresh even read-only recipients so deleted/revoked accounts lose access.
  const lifetime = Math.min(5 * 60_000, Math.max(0, (socket.data.user.exp ?? (Date.now() / 1000 + 300)) * 1000 - Date.now()));
  const expiry = setTimeout(() => {
    socket.emit('auth:refresh');
    socket.disconnect(true);
  }, lifetime);
  expiry.unref();
  socket.once('disconnect', () => clearTimeout(expiry));

  let windowStart = Date.now();
  let writes = 0;
  const mutate = async (ack: unknown, work: () => Promise<object>) => {
    const respond: Ack = typeof ack === 'function' ? ack as Ack : () => undefined;
    if (Date.now() - windowStart >= 60_000) { windowStart = Date.now(); writes = 0; }
    if (++writes > 60) { respond({ ok: false, error: 'Too many requests; try again shortly' }); return; }
    try {
      await withUserLock(userId, async () => {
        if (!socket.connected) throw new Error('Disconnected');
        await getFirebaseAuth().verifyIdToken(socket.handshake.auth.token, true);
        respond({ ok: true, ...await work() });
      });
    } catch {
      respond({ ok: false, error: 'Request failed; reconnect and try again' });
    }
  };

  // Compatibility for installed clients. New clients use REST for writes.
  socket.on('clipboard:create', (data, ack) => void mutate(ack, async () => {
    const clipboard = await createClipboard(userId, createClipboardSchema.parse(data));
    socket.to(room).emit('clipboard:new', clipboard);
    socket.emit('clipboard:created', clipboard);
    return { clipboard };
  }));
  socket.on('clipboard:delete', (data, ack) => void mutate(ack, async () => {
    const id = objectIdSchema.parse(data?.id);
    const deleted = await Clipboard.findOneAndDelete({ _id: id, userId });
    if (!deleted) throw new Error('Entry not found');
    io.to(room).emit('clipboard:deleted', { id });
    return { id };
  }));
  socket.on('clipboard:clearAll', (ack) => void mutate(ack, async () => {
    await Clipboard.deleteMany({ userId });
    io.to(room).emit('clipboard:cleared');
    return {};
  }));
};
