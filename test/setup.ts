import { vi, beforeEach } from 'vitest';

// ─── In-memory storage backing ──────────────────────────────────────────────

type ChangeListener = (changes: Record<string, { oldValue?: any; newValue?: any }>) => void;

function createInMemoryStorage() {
    let store = new Map<string, any>();
    const listeners: Set<ChangeListener> = new Set();

    function fireChanges(changes: Record<string, { oldValue?: any; newValue?: any }>) {
        // Fire asynchronously like the real browser API (next macrotask)
        setTimeout(() => {
            for (const fn of listeners) {
                try { fn(changes); } catch { /* ignore */ }
            }
        }, 0);
    }

    return {
        store,
        get: vi.fn(async (keys: null | string | string[] | Record<string, any>) => {
            if (keys === null) {
                const result: Record<string, any> = {};
                for (const [k, v] of store) result[k] = structuredClone(v);
                return result;
            }
            if (typeof keys === 'string') keys = [keys];
            if (Array.isArray(keys)) {
                const result: Record<string, any> = {};
                for (const k of keys) {
                    if (store.has(k)) result[k] = structuredClone(store.get(k));
                }
                return result;
            }
            // object with defaults
            const result: Record<string, any> = {};
            for (const [k, def] of Object.entries(keys)) {
                result[k] = store.has(k) ? structuredClone(store.get(k)) : def;
            }
            return result;
        }),
        set: vi.fn(async (items: Record<string, any>) => {
            const changes: Record<string, { oldValue?: any; newValue?: any }> = {};
            for (const [k, v] of Object.entries(items)) {
                const oldValue = store.has(k) ? structuredClone(store.get(k)) : undefined;
                store.set(k, structuredClone(v));
                changes[k] = { oldValue, newValue: structuredClone(v) };
            }
            fireChanges(changes);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
            if (typeof keys === 'string') keys = [keys];
            const changes: Record<string, { oldValue?: any; newValue?: any }> = {};
            for (const k of keys) {
                if (store.has(k)) {
                    changes[k] = { oldValue: structuredClone(store.get(k)) };
                    store.delete(k);
                }
            }
            if (Object.keys(changes).length > 0) fireChanges(changes);
        }),
        getBytesInUse: vi.fn(async (keys: null | string | string[]) => {
            if (keys === null) {
                let total = 0;
                for (const [k, v] of store) total += k.length + JSON.stringify(v).length;
                return total;
            }
            if (typeof keys === 'string') keys = [keys];
            let total = 0;
            for (const k of keys) {
                if (store.has(k)) total += k.length + JSON.stringify(store.get(k)).length;
            }
            return total;
        }),
        onChanged: {
            addListener: (fn: ChangeListener) => { listeners.add(fn); },
            removeListener: (fn: ChangeListener) => { listeners.delete(fn); },
        },
        _clear: () => { store.clear(); },
        _listeners: listeners,
    };
}

const localStorage = createInMemoryStorage();
const syncStorage = createInMemoryStorage();

// ─── Mock wxt/browser ───────────────────────────────────────────────────────

vi.mock('wxt/browser', () => ({
    browser: {
        storage: {
            local: {
                get: localStorage.get,
                set: localStorage.set,
                remove: localStorage.remove,
                getBytesInUse: localStorage.getBytesInUse,
                onChanged: localStorage.onChanged,
            },
            sync: {
                get: syncStorage.get,
                set: syncStorage.set,
                remove: syncStorage.remove,
                getBytesInUse: syncStorage.getBytesInUse,
                onChanged: syncStorage.onChanged,
            },
        },
        runtime: {
            sendMessage: vi.fn().mockResolvedValue(undefined),
            getManifest: vi.fn().mockReturnValue({ version: '1.0.0' }),
            onMessage: { addListener: vi.fn() },
            onInstalled: { addListener: vi.fn() },
        },
        alarms: {
            create: vi.fn(),
            clear: vi.fn().mockResolvedValue(true),
            getAll: vi.fn().mockResolvedValue([]),
        },
    },
}));

// ─── Mock import.meta.env ───────────────────────────────────────────────────

vi.mock('@/components/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// ─── Reset state before each test ───────────────────────────────────────────

beforeEach(async () => {
    localStorage._clear();
    syncStorage._clear();
    vi.clearAllMocks();

    // Reset singleton state
    const internal = await import('@/components/hideThreads/_internal');
    internal.setMemCache(null);
    internal.setLastPackedHash(null);
    internal.setMyDeviceId(null);
});

// ─── Helpers ────────────────────────────────────────────────────────────────

import {
    META_KEY, FORUM_KEY_PREFIX, GROUP_KEY_PREFIX, USERS_KEY, IGNORED_KEY,
    type FcData, type FcMetaStored,
} from '@/components/hideThreads/types';
import { normalize } from '@/components/hideThreads/validation';

/**
 * Seeds storage.local with v1 layout from a partial FcData.
 * Writes fc_meta + fc_f_* + fc_g_* + fc_users + fc_ignored.
 */
export async function seedStorage(partial: Partial<FcData> = {}): Promise<FcData> {
    const data = normalize(partial);
    const fids = Object.keys(data.f);
    const gids = Object.keys(data.g ?? {});

    const meta: FcMetaStored = { v: 1, s: data.s };
    if (fids.length > 0) meta.fids = fids;
    if (gids.length > 0) meta.gids = gids;

    const items: Record<string, any> = { [META_KEY]: meta };
    for (const [id, foroData] of Object.entries(data.f)) {
        items[`${FORUM_KEY_PREFIX}${id}`] = foroData;
    }
    for (const [id, groupData] of Object.entries(data.g ?? {})) {
        items[`${GROUP_KEY_PREFIX}${id}`] = groupData;
    }
    if (data.users && Object.keys(data.users).length > 0) items[USERS_KEY] = data.users;
    if (data.ignored && data.ignored.length > 0) items[IGNORED_KEY] = data.ignored;

    // Write directly to the map (bypass mock tracking)
    for (const [k, v] of Object.entries(items)) {
        localStorage.store.set(k, structuredClone(v));
    }

    return data;
}

/** Reads all data from the local storage map for assertions. */
export function readAllLocal(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of localStorage.store) result[k] = structuredClone(v);
    return result;
}

/** Reads all data from the sync storage map for assertions. */
export function readAllSync(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of syncStorage.store) result[k] = structuredClone(v);
    return result;
}
