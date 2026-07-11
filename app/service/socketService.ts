import io, { Socket } from 'socket.io-client';
import { auth } from '../firebaseConfig';
import { API_ORIGIN } from './apiService';
import { CustomClipboard } from './models';

const ACK_TIMEOUT_MS = 5000;

interface AckResponse {
  ok: boolean;
  error?: string;
  clipboard?: CustomClipboard;
  id?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private connectPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.socket?.connected) return;
    if (this.connectPromise) return this.connectPromise;

    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.socket = io(API_ORIGIN, {
        // Re-fetched on every (re)connection attempt, so reconnects after
        // token expiry (~1h) still authenticate.
        auth: (cb: (data: Record<string, unknown>) => void) => {
          auth.currentUser
            ?.getIdToken()
            .then((token: string) => cb({ token }))
            .catch(() => cb({}));
        },
      });

      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', (error) => {
        this.connectPromise = null;
        reject(error);
      });
    });
    return this.connectPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectPromise = null;
  }

  // --- Listeners ---

  onClipboardNew(callback: (clip: CustomClipboard) => void) {
    this.socket?.on('clipboard:new', callback);
  }

  onClipboardDeleted(callback: (data: { id: string }) => void) {
    this.socket?.on('clipboard:deleted', callback);
  }

  onClipboardCleared(callback: () => void) {
    this.socket?.on('clipboard:cleared', callback);
  }

  onReconnect(callback: () => void) {
    this.socket?.io.on('reconnect', callback);
  }

  // --- Emitters (all acked; failures surface as thrown errors) ---

  async createClipboard(deviceId: string, deviceName: string, content: string): Promise<CustomClipboard> {
    await this.connect();
    const res: AckResponse = await this.socket!
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('clipboard:create', { deviceId, deviceName, content });
    if (!res?.ok || !res.clipboard) throw new Error(res?.error || 'Failed to save clipboard entry');
    return res.clipboard;
  }

  async deleteClipboard(id: string): Promise<void> {
    await this.connect();
    const res: AckResponse = await this.socket!
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('clipboard:delete', { id });
    if (!res?.ok) throw new Error(res?.error || 'Failed to delete clipboard entry');
  }

  async clearAllClipboards(): Promise<void> {
    await this.connect();
    const res: AckResponse = await this.socket!
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('clipboard:clearAll');
    if (!res?.ok) throw new Error(res?.error || 'Failed to clear clipboard entries');
  }
}

export const socketService = new SocketService();
