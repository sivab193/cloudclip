jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { decide, getSyncState, setSyncState, clearSyncState, SyncState, LatestEntry } from '../syncEngine';
import { hashText } from '../cryptoService';

const state = (overrides: Partial<SyncState> = {}): SyncState => ({
    lastSyncedHash: null,
    lastSeenServerId: null,
    ...overrides,
});

const server = (id: string, text: string): LatestEntry => ({ id, text });

describe('decide()', () => {
    const cases: {
        name: string;
        device: string | null;
        latest: LatestEntry | null;
        st: SyncState;
        expected: ReturnType<typeof decide>;
    }[] = [
        {
            name: 'fresh device text, empty server → push',
            device: 'new copy',
            latest: null,
            st: state(),
            expected: { action: 'push', text: 'new copy' },
        },
        {
            name: 'device text changed since last sync and differs from server → push',
            device: 'newer',
            latest: server('s1', 'older'),
            st: state({ lastSyncedHash: hashText('older'), lastSeenServerId: 's1' }),
            expected: { action: 'push', text: 'newer' },
        },
        {
            name: 'device text already the latest server entry → mark seen, no push',
            device: 'same',
            latest: server('s2', 'same'),
            st: state(),
            expected: { action: 'noop' },
        },
        {
            name: 'device text unchanged since last sync, unseen server entry → pull',
            device: 'old copy',
            latest: server('s3', 'from another device'),
            st: state({ lastSyncedHash: hashText('old copy') }),
            expected: { action: 'pull', entry: server('s3', 'from another device') },
        },
        {
            name: 'empty clipboard, unseen server entry → pull',
            device: '',
            latest: server('s4', 'hello'),
            st: state(),
            expected: { action: 'pull', entry: server('s4', 'hello') },
        },
        {
            name: 'whitespace-only clipboard behaves like empty',
            device: '   \n ',
            latest: server('s5', 'hello'),
            st: state(),
            expected: { action: 'pull', entry: server('s5', 'hello') },
        },
        {
            name: 'server entry already seen → noop',
            device: null,
            latest: server('s6', 'seen before'),
            st: state({ lastSeenServerId: 's6' }),
            expected: { action: 'noop' },
        },
        {
            name: 'nothing anywhere → noop',
            device: null,
            latest: null,
            st: state(),
            expected: { action: 'noop' },
        },
        {
            name: 'device text unchanged and equals server latest → noop (no loop)',
            device: 'stable',
            latest: server('s7', 'stable'),
            st: state({ lastSyncedHash: hashText('stable'), lastSeenServerId: 's7' }),
            expected: { action: 'noop' },
        },
        {
            name: 'pull skipped when server text equals device text even if id unseen',
            device: 'dup',
            latest: server('s8', 'dup'),
            st: state({ lastSyncedHash: hashText('dup') }),
            expected: { action: 'noop' },
        },
    ];

    it.each(cases)('$name', ({ device, latest, st, expected }) => {
        expect(decide(device, latest, st)).toEqual(expected);
    });

    it('push wins over pull when both sides are new', () => {
        // Device has something we never synced AND the server has an unseen
        // entry: the local copy is what the user most recently acted on.
        const result = decide('local new', server('s9', 'remote new'), state());
        expect(result).toEqual({ action: 'push', text: 'local new' });
    });
});

describe('sync state storage', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
    });

    it('round-trips state', async () => {
        await setSyncState({ lastSyncedHash: 'abc', lastSeenServerId: 'id1' });
        expect(await getSyncState()).toEqual({ lastSyncedHash: 'abc', lastSeenServerId: 'id1' });
    });

    it('clearSyncState wipes both keys', async () => {
        await setSyncState({ lastSyncedHash: 'abc', lastSeenServerId: 'id1' });
        await clearSyncState();
        const cleared = await getSyncState();
        expect(cleared.lastSyncedHash).toBeFalsy();
        expect(cleared.lastSeenServerId).toBeFalsy();
    });
});
