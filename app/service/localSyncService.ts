import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomClipboard } from './models';

const KEY = 'cc.localServer';
export interface LocalServerConfig { enabled: boolean; url: string; token: string }
export const getLocalServerConfig = async (): Promise<LocalServerConfig> => {
  const value = await AsyncStorage.getItem(KEY);
  try { return { enabled: false, url: '', token: '', ...(value ? JSON.parse(value) : {}) }; }
  catch { return { enabled: false, url: '', token: '' }; }
};
export const setLocalServerConfig = async (config: LocalServerConfig) => {
  const normalized = { ...config, url: config.url.trim().replace(/\/+$/, ''), token: config.token.trim() };
  await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
  return normalized;
};
const request = async (config: LocalServerConfig, path: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${config.url}${path}`, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`, ...(init?.headers || {}) } });
    if (!response.ok) throw new Error(response.status === 401 ? 'Pairing token was rejected' : `Mac returned ${response.status}`);
    return response;
  } finally { clearTimeout(timeout); }
};
export const testLocalServer = async (config: LocalServerConfig) => { await request(config, '/clips'); return true; };
export const getLocalClips = async (config: LocalServerConfig): Promise<CustomClipboard[]> => (await request(config, '/clips')).json();
export const addLocalClip = async (config: LocalServerConfig, text: string, deviceName: string): Promise<CustomClipboard> => (await request(config, '/clips', { method: 'POST', body: JSON.stringify({ text, deviceName }) })).json();
export const deleteLocalClip = async (config: LocalServerConfig, id: string) => { await request(config, `/clips/${encodeURIComponent(id)}`, { method: 'DELETE' }); };
export const clearLocalClips = async (config: LocalServerConfig) => { await request(config, '/clips', { method: 'DELETE' }); };
