import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '@/auth/AuthContext';
import { apiService, ApiError } from '@/service/apiService';
import { socketService } from '@/service/socketService';
import { getMasterKey, getMasterKeyId, lockLocal } from '@/service/keyService';
import { decryptEntry, encryptEntry, isEnvelope, hashText } from '@/service/cryptoService';
import { decide, getSyncState, setSyncState, getAutoReadSetting } from '@/service/syncEngine';
import { CustomClipboard } from '@/service/models';
import useDeviceDetails from './useDeviceDetails';
import useAccountGuard from './useAccountGuard';
import { addLocalClip, clearLocalClips, deleteLocalClip, getLocalClips, getLocalServerConfig, LocalServerConfig } from '@/service/localSyncService';

export interface DisplayClip extends CustomClipboard { legacy?: boolean; unreadable?: boolean }
const id = (clip: CustomClipboard) => clip._id || clip.id || '';
const decrypt = (key: Uint8Array, clip: CustomClipboard): DisplayClip => {
  if (!isEnvelope(clip.content)) return { ...clip, legacy: true };
  try { return { ...clip, content: decryptEntry(key, clip.content) }; }
  catch { return { ...clip, content: '[Unable to decrypt]', unreadable: true }; }
};
const foreground = () => Platform.OS === 'web'
  ? typeof document !== 'undefined' && document.visibilityState === 'visible'
  : AppState.currentState === 'active';

export default function useClipboardSync(showAlert: (message: string) => void) {
  const { user, encryptionReady, refreshEncryptionReady } = useAuth();
  const { deviceId, deviceName } = useDeviceDetails();
  const [data, setData] = useState<{ uid?: string; entries: DisplayClip[] }>({ entries: [] });
  const [localConfig, setLocalConfig] = useState<LocalServerConfig | null>(null);
  const revision = useRef(0);
  const running = useRef<{ valid: () => boolean; rerun: boolean } | null>(null);
  const busy = useRef<(() => boolean) | null>(null);
  const { capture, invalidate } = useAccountGuard();
  const localMode = Boolean(localConfig?.enabled && localConfig.url && localConfig.token);
  const uid = localMode ? `local:${localConfig!.url}` : user?.uid;
  const entries = data.uid === uid && (localMode || encryptionReady) ? data.entries : [];
  const update = (change: (current: DisplayClip[]) => DisplayClip[], valid = capture()) => {
    if (!valid()) return;
    revision.current++;
    setData(current => valid() ? { uid, entries: change(current.uid === uid ? current.entries : []) } : current);
  };
  const prepend = (clip: DisplayClip, valid: () => boolean) => update(current => [clip, ...current.filter(c => id(c) !== id(clip))].slice(0, 100), valid);

  useEffect(() => { void getLocalServerConfig().then(setLocalConfig); }, []);

  const persist = async (text: string, key: Uint8Array, valid: () => boolean) => {
    const requestId = randomUUID();
    const content = encryptEntry(key, text);
    if (!valid() || !deviceId) throw new Error('Sign in again to save');
    const keyId = getMasterKeyId(key);
    try { return await apiService.createClipboard(deviceId, deviceName ?? 'My device', content, requestId, keyId); }
    catch (error) {
      if (error instanceof ApiError || !valid()) throw error;
      // A lost response is safe to retry with the same request ID/ciphertext.
      getMasterKeyId(key);
      return apiService.createClipboard(deviceId, deviceName ?? 'My device', content, requestId, keyId);
    }
  };

  const runForegroundSync = async () => {
    const valid = capture();
    if (!valid() || !deviceId || !foreground()) return;
    if (running.current?.valid()) { running.current.rerun = true; return; }
    const operation = { valid, rerun: false };
    running.current = operation;
    try {
      const key = await getMasterKey(true);
      if (!valid()) return;
      if (!key) { await refreshEncryptionReady(); return; }
      const started = revision.current;
      const clips = (await apiService.getClipboards()).map(clip => decrypt(key, clip));
      if (!valid() || started !== revision.current) return;
      update(() => clips, valid);
      const latest = clips[0] && !clips[0].legacy && !clips[0].unreadable
        ? { id: id(clips[0]), text: clips[0].content } : null;
      if (!await getAutoReadSetting() || !valid() || !foreground()) return;
      const deviceText = await Clipboard.getStringAsync();
      const state = await getSyncState(uid!);
      if (!valid() || !foreground()) return;
      const decision = decide(deviceText, latest, state);
      if (decision.action === 'push') {
        const saved = await persist(decision.text, key, valid);
        if (!valid()) return;
        prepend({ ...saved, content: decision.text }, valid);
        await setSyncState({ lastSyncedHash: hashText(decision.text), lastSeenServerId: id(saved) }, uid!);
      } else if (decision.action === 'pull') {
        // Do not overwrite a copy the user made while the request was pending.
        if (await Clipboard.getStringAsync() !== deviceText || !valid() || !foreground()) return;
        await Clipboard.setStringAsync(decision.entry.text);
        await setSyncState({ lastSyncedHash: hashText(decision.entry.text), lastSeenServerId: decision.entry.id }, uid!);
      } else if (latest) {
        await setSyncState({ lastSyncedHash: hashText(deviceText), lastSeenServerId: latest.id }, uid!);
      }
    } catch (error) {
      if (valid()) showAlert(error instanceof Error ? error.message : 'Sync failed — check your connection');
    } finally {
      if (running.current === operation) {
        running.current = null;
        if (operation.rerun && valid()) void runRef.current();
      }
    }
  };
  const runRef = useRef(runForegroundSync);
  runRef.current = runForegroundSync;

  useEffect(() => {
    if (localMode || !uid || !encryptionReady || !deviceId) return;
    socketService.connect();
    socketService.onClipboardNew(async clip => {
      const valid = capture();
      try {
        const key = await getMasterKey();
        if (key && valid()) {
          prepend(decrypt(key, clip), valid);
          void runRef.current();
        }
      } catch { /* foreground refresh reports errors */ }
    });
    socketService.onClipboardDeleted(({ id: deleted }) => update(current => current.filter(c => id(c) !== deleted)));
    socketService.onClipboardCleared(() => update(() => []));
    socketService.onEncryptionReset(() => {
      invalidate();
      revision.current++;
      setData({ uid, entries: [] });
      void lockLocal().then(refreshEncryptionReady).catch(() => showAlert('Could not lock local data. Sign out and try again.'));
    });
    socketService.onReconnect(() => void runRef.current());
    void runRef.current();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void runRef.current();
    });
    const onVisible = () => { if (foreground()) void runRef.current(); };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', onVisible);
    return () => {
      invalidate();
      revision.current++;
      socketService.disconnect();
      subscription.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uid, encryptionReady, deviceId, capture, invalidate, localMode]);

  useEffect(() => {
    if (!localMode || !localConfig || !deviceId) return;
    let active = true;
    const sync = async () => {
      if (!active || !foreground()) return;
      try {
        const clips = await getLocalClips(localConfig);
        if (!active) return;
        setData({ uid, entries: clips });
        if (!await getAutoReadSetting()) return;
        const deviceText = await Clipboard.getStringAsync();
        const latest = clips[0] ? { id: id(clips[0]), text: clips[0].content } : null;
        const syncKey = `local:${localConfig.url}`;
        const decision = decide(deviceText, latest, await getSyncState(syncKey));
        if (decision.action === 'push') {
          const saved = await addLocalClip(localConfig, decision.text, deviceName ?? 'Android');
          if (active) setData({ uid, entries: [saved, ...clips.filter(item => id(item) !== id(saved))] });
          await setSyncState({ lastSyncedHash: hashText(decision.text), lastSeenServerId: id(saved) }, syncKey);
        } else if (decision.action === 'pull') {
          if (await Clipboard.getStringAsync() === deviceText) await Clipboard.setStringAsync(decision.entry.text);
          await setSyncState({ lastSyncedHash: hashText(decision.entry.text), lastSeenServerId: decision.entry.id }, syncKey);
        }
      } catch (error) { if (active) showAlert(error instanceof Error ? error.message : 'Local sync failed'); }
    };
    void sync();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    return () => { active = false; subscription.remove(); };
  }, [localMode, localConfig?.url, localConfig?.token, deviceId, deviceName, uid]);

  const save = async (text: string) => {
    if (!text.trim()) throw new Error('Please enter some text to save');
    if (localMode && localConfig) {
      const saved = await addLocalClip(localConfig, text, deviceName ?? 'Android');
      setData(current => ({ uid, entries: [saved, ...current.entries.filter(item => id(item) !== id(saved))] }));
      return true;
    }
    const valid = capture();
    if (!valid()) throw new Error('Unlock your data first');
    if (busy.current?.()) return false;
    busy.current = valid;
    try {
      const key = await getMasterKey(true);
      if (!key) throw new Error('Unlock your data first');
      const saved = await persist(text, key, valid);
      if (!valid()) return false;
      prepend({ ...saved, content: text }, valid);
      return true;
    } finally { if (busy.current === valid) busy.current = null; }
  };
  const remove = async (clipId: string) => {
    if (localMode && localConfig) {
      await deleteLocalClip(localConfig, clipId);
      setData(current => ({ uid, entries: current.entries.filter(clip => id(clip) !== clipId) }));
      return;
    }
    const valid = capture();
    if (!valid()) return;
    await apiService.deleteClipboard(clipId);
    update(current => current.filter(clip => id(clip) !== clipId), valid);
  };
  const clear = async () => {
    if (localMode && localConfig) {
      await clearLocalClips(localConfig);
      setData({ uid, entries: [] });
      return;
    }
    const valid = capture();
    if (!valid()) return;
    await apiService.clearAllClipboards();
    update(() => [], valid);
  };
  return { entries, save, remove, clear };
}
