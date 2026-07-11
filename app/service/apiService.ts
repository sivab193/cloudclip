import { auth } from '../firebaseConfig';
import { Device, CustomClipboard, Shared, User } from './models';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000/api';

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

  async syncUser(email: string, name: string): Promise<User> {
    const res = await fetch(`${BACKEND_URL}/users/sync`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ email, name })
    });
    if (!res.ok) throw new Error('Failed to sync user');
    return res.json();
  }

  // --- DEVICES ---

  async getDevices(): Promise<Device[]> {
    const res = await fetch(`${BACKEND_URL}/devices`, {
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch devices');
    return res.json();
  }

  async registerDevice(deviceId: string, deviceName: string, os: string): Promise<Device> {
    const res = await fetch(`${BACKEND_URL}/devices`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ deviceId, deviceName, os })
    });
    if (!res.ok) throw new Error('Failed to register device');
    return res.json();
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/devices/${deviceId}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete device');
  }

  // --- CLIPBOARDS (REST fallback) ---

  async getClipboards(limit: number = 50): Promise<CustomClipboard[]> {
    const res = await fetch(`${BACKEND_URL}/clipboards?limit=${limit}`, {
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch clipboards');
    return res.json();
  }

  // --- SHARED LINKS ---

  async getSharedLinks(): Promise<Shared[]> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch shared links');
    return res.json();
  }

  async createSharedLink(content: string, clipboardId?: string): Promise<Shared> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ content, clipboardId })
    });
    if (!res.ok) throw new Error('Failed to create shared link');
    return res.json();
  }

  async getSharedLinkByCode(code: string): Promise<Shared> {
    // Public route, no auth headers needed
    const res = await fetch(`${BACKEND_URL}/shared/${code}`);
    if (!res.ok) {
        if (res.status === 404) throw new Error('Link expired or not found');
        throw new Error('Failed to fetch shared link');
    }
    return res.json();
  }

  async deleteSharedLink(id: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/shared/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete shared link');
  }
}

export const apiService = new ApiService();
