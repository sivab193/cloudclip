import { auth } from '../firebaseConfig';
import { Device, CustomClipboard, Shared, PublicShared, User, EncryptionKeys } from './models';

// Bare origin (no /api suffix) — shared with socketService.
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const BACKEND_URL = `${API_ORIGIN}/api`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const ensureOk = async (res: Response, fallbackMessage: string): Promise<Response> => {
  if (res.ok) return res;
  let message = fallbackMessage;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch { /* non-JSON error body */ }
  throw new ApiError(res.status, message);
};

class ApiService {
  private async getHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // --- USERS ---

  async syncUser(name?: string): Promise<User> {
    const res = await fetch(`${BACKEND_URL}/users/sync`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(name ? { name } : {})
    });
    await ensureOk(res, 'Failed to sync user');
    return res.json();
  }

  async deleteAccount(): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/users/me`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to delete account');
  }

  // --- E2E KEYS ---

  async getKeys(): Promise<EncryptionKeys | null> {
    const res = await fetch(`${BACKEND_URL}/users/me/keys`, {
      headers: await this.getHeaders()
    });
    if (res.status === 404) return null;
    await ensureOk(res, 'Failed to fetch encryption keys');
    return res.json();
  }

  async putKeys(keys: EncryptionKeys): Promise<EncryptionKeys> {
    const res = await fetch(`${BACKEND_URL}/users/me/keys`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(keys)
    });
    await ensureOk(res, 'Failed to store encryption keys');
    return res.json();
  }

  async deleteKeys(): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/users/me/keys`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to reset encryption keys');
  }

  // --- DEVICES ---

  async getDevices(): Promise<Device[]> {
    const res = await fetch(`${BACKEND_URL}/devices`, {
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to fetch devices');
    return res.json();
  }

  async registerDevice(deviceId: string, deviceName: string, os: string): Promise<Device> {
    const res = await fetch(`${BACKEND_URL}/devices`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ deviceId, deviceName, os })
    });
    await ensureOk(res, 'Failed to register device');
    return res.json();
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to delete device');
  }

  // --- CLIPBOARDS (REST fallback) ---

  async getClipboards(limit: number = 50): Promise<CustomClipboard[]> {
    const res = await fetch(`${BACKEND_URL}/clipboards?limit=${limit}`, {
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to fetch clipboards');
    return res.json();
  }

  async deleteClipboard(id: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/clipboards/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to delete clipboard entry');
  }

  // --- SHARED LINKS ---

  async getSharedLinks(): Promise<Shared[]> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to fetch shared links');
    return res.json();
  }

  async createSharedLink(params: {
    content: string;
    code: string;
    ownerWrappedKey?: string;
    ownerWrapNonce?: string;
    clipboardId?: string;
    ttlDays?: number;
  }): Promise<Shared> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(params)
    });
    await ensureOk(res, 'Failed to create shared link');
    return res.json();
  }

  async getSharedLinkByCode(code: string): Promise<PublicShared> {
    // Public route, no auth headers needed
    const res = await fetch(`${BACKEND_URL}/shared/${encodeURIComponent(code)}`);
    if (res.status === 404) throw new ApiError(404, 'Link expired or not found');
    await ensureOk(res, 'Failed to fetch shared link');
    return res.json();
  }

  async deleteSharedLink(id: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/shared/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to delete shared link');
  }

  async deleteAllSharedLinks(): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to delete shared links');
  }
}

export const apiService = new ApiService();
