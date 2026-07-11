import io, { Socket } from 'socket.io-client';
import { auth } from '../firebaseConfig';
import { CustomClipboard, Shared } from './models';

// Use local IP for testing, or production backend URL
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    this.socket = io(BACKEND_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
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

  // --- Emitters ---

  createClipboard(deviceId: string, deviceName: string, content: string) {
    this.socket?.emit('clipboard:create', { deviceId, deviceName, content });
  }

  deleteClipboard(id: string) {
    this.socket?.emit('clipboard:delete', { id });
  }

  clearAllClipboards() {
    this.socket?.emit('clipboard:clearAll');
  }
}

export const socketService = new SocketService();
