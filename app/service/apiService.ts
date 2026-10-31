import { auth } from '../firebaseConfig';
import { Device, CustomClipboard, Shared, PublicShared, User, EncryptionKeys, PublishedSite, PublishResult, SiteDeploymentSummary, PublisherKey, SiteVisibility } from './models';

// Bare origin (no /api suffix) — shared with socketService.
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || 'https://api-us.cclip.cc').replace(/\/+$/, '');
const BACKEND_URL = `${API_ORIGIN}/api`;

const fetch = async (url: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await globalThis.fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

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
    if (auth.currentUser !== user) throw new Error('Account changed; try again');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Multipart uploads must NOT set Content-Type — the runtime adds the
  // multipart boundary. Only the bearer token is attached.
  private async getAuthOnlyHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();
    if (auth.currentUser !== user) throw new Error('Account changed; try again');
    return { 'Authorization': `Bearer ${token}` };
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

  // --- CLIPBOARDS (durable writes; sockets carry notifications) ---

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

  async createClipboard(deviceId: string, deviceName: string, content: string, requestId: string, keyId: string | null): Promise<CustomClipboard> {
    const res = await fetch(`${BACKEND_URL}/clipboards`, {
      method: 'POST', headers: await this.getHeaders(),
      body: JSON.stringify({ deviceId, deviceName, content, requestId, keyId }),
    });
    await ensureOk(res, 'Failed to save clipboard entry');
    return res.json();
  }

  async clearAllClipboards(): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/clipboards`, { method: 'DELETE', headers: await this.getHeaders() });
    await ensureOk(res, 'Failed to clear clipboard entries');
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
    keyId: string | null;
    content: string;
    code: string;
    ownerWrappedKey?: string;
    ownerWrapNonce?: string;
    clipboardId?: string;
    token: string;
    ttlMinutes?: number;
  }): Promise<Shared> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(params)
    });
    await ensureOk(res, 'Failed to create shared link');
    return res.json();
  }

  async createAnonymousSharedLink(params: { content: string; code: string; token: string; ttlMinutes: number }): Promise<Pick<Shared, 'code' | 'createdAt' | 'expiryAt'>> {
    const res = await fetch(`${BACKEND_URL}/shared/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    await ensureOk(res, 'Could not create the shared link');
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

  async updateSharedLinkExpiry(id: string, ttlMinutes: number): Promise<Shared> {
    const res = await fetch(`${BACKEND_URL}/shared/${encodeURIComponent(id)}/expiry`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ ttlMinutes }),
    });
    await ensureOk(res, 'Failed to update shared link expiry');
    return res.json();
  }

  async deleteAllSharedLinks(): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/shared`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });
    await ensureOk(res, 'Failed to delete shared links');
  }

  // --- HOSTED SITES ---

  async getSites(): Promise<PublishedSite[]> {
    const res = await fetch(`${BACKEND_URL}/sites`, { headers: await this.getHeaders() });
    await ensureOk(res, 'Failed to fetch sites');
    return res.json();
  }

  async getSite(id: string): Promise<PublishedSite> {
    const res = await fetch(`${BACKEND_URL}/sites/${encodeURIComponent(id)}`, { headers: await this.getHeaders() });
    await ensureOk(res, 'Failed to fetch site');
    return res.json();
  }

  // Uploads are larger than JSON requests, so use a generous timeout.
  private async uploadMultipart(url: string, form: FormData): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      return await globalThis.fetch(url, {
        method: 'POST',
        headers: await this.getAuthOnlyHeaders(),
        body: form as any,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async publishSite(params: {
    source: Blob | { uri: string; name: string; type: string };
    filename: string;
    slug?: string;
    displayName?: string;
    visibility?: SiteVisibility;
    password?: string;
  }): Promise<PublishResult> {
    const form = new FormData();
    // On web `source` is a Blob/File; on native it's the {uri,name,type} shape.
    form.append('source', params.source as any, params.filename);
    if (params.slug) form.append('slug', params.slug);
    if (params.displayName) form.append('displayName', params.displayName);
    if (params.visibility) form.append('visibility', params.visibility);
    if (params.password) form.append('password', params.password);
    const res = await this.uploadMultipart(`${BACKEND_URL}/sites`, form);
    await ensureOk(res, 'Failed to publish site');
    return res.json();
  }

  async redeploySite(id: string, source: Blob | { uri: string; name: string; type: string }, filename: string): Promise<PublishResult> {
    const form = new FormData();
    form.append('source', source as any, filename);
    const res = await this.uploadMultipart(`${BACKEND_URL}/sites/${encodeURIComponent(id)}/deployments`, form);
    await ensureOk(res, 'Failed to redeploy site');
    return res.json();
  }

  async getSiteDeployments(id: string): Promise<SiteDeploymentSummary[]> {
    const res = await fetch(`${BACKEND_URL}/sites/${encodeURIComponent(id)}/deployments`, { headers: await this.getHeaders() });
    await ensureOk(res, 'Failed to fetch deployments');
    return res.json();
  }

  async updateSite(id: string, params: { displayName?: string; visibility?: SiteVisibility; password?: string }): Promise<PublishedSite> {
    const res = await fetch(`${BACKEND_URL}/sites/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(params),
    });
    await ensureOk(res, 'Failed to update site');
    return res.json();
  }

  async deleteSite(id: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/sites/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    await ensureOk(res, 'Failed to delete site');
  }

  // --- PUBLISHER KEYS ---

  async getPublisherKeys(): Promise<PublisherKey[]> {
    const res = await fetch(`${BACKEND_URL}/sites/keys/list`, { headers: await this.getHeaders() });
    await ensureOk(res, 'Failed to fetch publisher keys');
    return res.json();
  }

  async createPublisherKey(label: string): Promise<PublisherKey> {
    const res = await fetch(`${BACKEND_URL}/sites/keys`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ label }),
    });
    await ensureOk(res, 'Failed to create publisher key');
    return res.json();
  }

  async deletePublisherKey(id: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/sites/keys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    await ensureOk(res, 'Failed to revoke publisher key');
  }
}

export const apiService = new ApiService();
