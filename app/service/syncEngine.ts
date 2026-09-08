import AsyncStorage from '@react-native-async-storage/async-storage';
import { hashText } from './cryptoService';

/**
 * Foreground-only clipboard sync. No background polling — modern mobile OSes
 * forbid it. When the app opens/foregrounds:
 * - device clipboard has something new (changed since we last synced, and not
 *   already the latest server entry) → PUSH it,
 * - otherwise a server entry we haven't seen yet → PULL it into the clipboard,
 * - otherwise NOOP.
 * `decide` is pure; storage-backed state lives in AsyncStorage.
 */

export interface SyncState {
    lastSyncedHash: string | null;
    lastSeenServerId: string | null;
}

export interface LatestEntry {
    id: string;
    text: string;
}

export type SyncDecision =
    | { action: 'push'; text: string }
    | { action: 'pull'; entry: LatestEntry }
    | { action: 'noop' };

export const decide = (
    deviceText: string | null,
    latestServer: LatestEntry | null,
    state: SyncState
): SyncDecision => {
    const text = deviceText ?? '';
    if (text.trim()) {
        const hash = hashText(text);
        if (hash !== state.lastSyncedHash && text !== latestServer?.text) {
            return { action: 'push', text };
        }
    }
    if (latestServer && latestServer.id !== state.lastSeenServerId && latestServer.text !== text) {
        return { action: 'pull', entry: latestServer };
    }
    return { action: 'noop' };
};

const HASH_KEY = 'cc.lastSyncedHash';
const SEEN_KEY = 'cc.lastSeenServerId';
const AUTO_READ_KEY = 'cc.autoReadClipboard';

export const getSyncState = async (uid = 'legacy'): Promise<SyncState> => {
    const [hash, seen] = await AsyncStorage.multiGet([`${HASH_KEY}.${uid}`, `${SEEN_KEY}.${uid}`]);
    return { lastSyncedHash: hash[1], lastSeenServerId: seen[1] };
};

export const setSyncState = async (state: SyncState, uid = 'legacy'): Promise<void> => {
    await AsyncStorage.multiSet([
        [`${HASH_KEY}.${uid}`, state.lastSyncedHash ?? ''],
        [`${SEEN_KEY}.${uid}`, state.lastSeenServerId ?? ''],
    ]);
};

export const clearSyncState = async (): Promise<void> => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter(key => key.startsWith(HASH_KEY) || key.startsWith(SEEN_KEY)));
};

/**
 * Whether the app may read/write the OS clipboard automatically on foreground.
 * Opt-in on every platform: reading sends clipboard text to the user's sync
 * account, so the user must enable this after seeing the disclosure.
 */
export const getAutoReadSetting = async (): Promise<boolean> => {
    const stored = await AsyncStorage.getItem(AUTO_READ_KEY);
    if (stored !== null) return stored === 'true';
    return false;
};

export const setAutoReadSetting = async (enabled: boolean): Promise<void> => {
    await AsyncStorage.setItem(AUTO_READ_KEY, String(enabled));
};
