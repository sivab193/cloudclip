import io, { Socket } from 'socket.io-client';
import { auth } from '../firebaseConfig';
import { API_ORIGIN } from './apiService';
import { CustomClipboard } from './models';

// Socket.io carries notifications. REST remains usable while the socket is
// offline; each reconnect triggers a fresh snapshot from the server.
class SocketService {
  private socket: Socket | null = null;
  private uid: string | null = null;

  connect(): void {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (this.socket && this.uid === uid) return;
    this.disconnect();
    this.uid = uid;
    const socket = io(API_ORIGIN, {
      auth: (callback) => {
        const user = auth.currentUser;
        if (!user || user.uid !== uid) { callback({}); return; }
        user.getIdToken().then(token => callback({ token })).catch(() => callback({}));
      },
    });
    this.socket = socket;
    let refresh = false;
    socket.on('auth:refresh', () => { refresh = true; });
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' && refresh && auth.currentUser?.uid === uid) {
        refresh = false;
        socket.connect();
      }
    });
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.uid = null;
  }

  onClipboardNew(callback: (clip: CustomClipboard) => void) { this.socket?.on('clipboard:new', callback); }
  onClipboardDeleted(callback: (data: { id: string }) => void) { this.socket?.on('clipboard:deleted', callback); }
  onClipboardCleared(callback: () => void) { this.socket?.on('clipboard:cleared', callback); }
  onEncryptionReset(callback: () => void) { this.socket?.on('encryption:reset', callback); }
  onReconnect(callback: () => void) { this.socket?.on('connect', callback); }
}

export const socketService = new SocketService();
