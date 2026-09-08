import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { AppState } from 'react-native';
import useClipboardSync from '../useClipboardSync';
import { auth } from '../../firebaseConfig';
import { apiService } from '../../service/apiService';
import { getMasterKey } from '../../service/keyService';
import { socketService } from '../../service/socketService';
import { CustomClipboard } from '../../service/models';

const mockAuth = { user: { uid: 'a' }, encryptionReady: true, refreshEncryptionReady: jest.fn() };
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../firebaseConfig', () => ({ auth: { currentUser: null } }));
jest.mock('../useDeviceDetails', () => ({ __esModule: true, default: () => ({ deviceId: 'device', deviceName: 'Phone' }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('../../service/apiService', () => ({
  ApiError: class extends Error {},
  apiService: { getClipboards: jest.fn(), createClipboard: jest.fn(), deleteClipboard: jest.fn(), clearAllClipboards: jest.fn() },
}));
jest.mock('../../service/keyService', () => ({ getMasterKey: jest.fn(), getMasterKeyId: () => 'key', lockLocal: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../service/cryptoService', () => ({ isEnvelope: () => false, encryptEntry: () => 'ciphertext', hashText: (text: string) => text }));
jest.mock('../../service/syncEngine', () => ({ getAutoReadSetting: jest.fn().mockResolvedValue(false) }));
jest.mock('../../service/socketService', () => ({ socketService: {
  connect: jest.fn(), disconnect: jest.fn(), onClipboardNew: jest.fn(), onClipboardDeleted: jest.fn(),
  onClipboardCleared: jest.fn(), onEncryptionReset: jest.fn(), onReconnect: jest.fn(),
} }));

const clip = (id: string): CustomClipboard => ({ _id: id, content: id, userId: 'a', deviceId: 'device', deviceName: 'Phone' });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
let renderer: ReactTestRenderer;
let result: ReturnType<typeof useClipboardSync>;
const showAlert = jest.fn();
function Harness() { result = useClipboardSync(showAlert); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.user = { uid: 'a' };
  mockAuth.encryptionReady = true;
  (auth as any).currentUser = mockAuth.user;
  AppState.currentState = 'active';
  jest.mocked(getMasterKey).mockResolvedValue(new Uint8Array(32));
  jest.mocked(apiService.getClipboards).mockResolvedValue([]);
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

it('does not let an old-account fetch block or replace the new account', async () => {
  const oldFetch = deferred<CustomClipboard[]>();
  jest.mocked(apiService.getClipboards).mockReturnValueOnce(oldFetch.promise).mockResolvedValueOnce([clip('new')]);
  await act(async () => { renderer = create(<Harness />); });
  mockAuth.user = { uid: 'b' };
  (auth as any).currentUser = mockAuth.user;
  await act(async () => renderer.update(<Harness />));
  expect(result.entries.map(c => c._id)).toEqual(['new']);
  await act(async () => oldFetch.resolve([clip('old')]));
  expect(result.entries.map(c => c._id)).toEqual(['new']);
});

it('discards a save waiting for a key when encryption is locked and unlocked again', async () => {
  await act(async () => { renderer = create(<Harness />); });
  const oldKey = deferred<Uint8Array>();
  jest.mocked(getMasterKey).mockReturnValueOnce(oldKey.promise);
  const pending = result.save('private text');
  const rejected = expect(pending).rejects.toThrow('Sign in again');
  mockAuth.encryptionReady = false;
  await act(async () => renderer.update(<Harness />));
  mockAuth.encryptionReady = true;
  await act(async () => renderer.update(<Harness />));
  await act(async () => oldKey.resolve(new Uint8Array(32)));
  await rejected;
  expect(apiService.createClipboard).not.toHaveBeenCalled();
});

it('retries an uncertain write with the identical request ID and ciphertext', async () => {
  await act(async () => { renderer = create(<Harness />); });
  jest.mocked(apiService.createClipboard).mockRejectedValueOnce(new TypeError('Network failed')).mockResolvedValueOnce(clip('saved'));
  await act(async () => { expect(await result.save('  preserve whitespace  ')).toBe(true); });
  expect(jest.mocked(apiService.createClipboard).mock.calls[0]).toEqual(jest.mocked(apiService.createClipboard).mock.calls[1]);
  expect(result.entries[0].content).toBe('  preserve whitespace  ');
});

it('coalesces a reconnect during an in-flight fetch into another refresh', async () => {
  const firstFetch = deferred<CustomClipboard[]>();
  jest.mocked(apiService.getClipboards).mockReturnValueOnce(firstFetch.promise).mockResolvedValueOnce([clip('latest')]);
  await act(async () => { renderer = create(<Harness />); });
  const reconnect = jest.mocked(socketService.onReconnect).mock.calls[0][0];
  await act(async () => reconnect());
  await act(async () => firstFetch.resolve([]));
  expect(apiService.getClipboards).toHaveBeenCalledTimes(2);
  expect(result.entries[0]._id).toBe('latest');
});
