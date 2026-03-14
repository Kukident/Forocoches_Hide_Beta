import { browser } from 'wxt/browser';
import {
    META_KEY, FORUM_KEY_PREFIX, GROUP_KEY_PREFIX, USERS_KEY, IGNORED_KEY,
    HASH_KEY, DEVICE_ID_KEY,
    type FcData,
} from './types';

// ─── Validación de IDs ──────────────────────────────────────────────────────

const VALID_FORUM_ID = /^[a-zA-Z0-9_*-]+$/;
const VALID_GROUP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function assertForumId(id: string): void {
    if (!VALID_FORUM_ID.test(id)) throw new Error(`Forum ID inválido: ${id}`);
}

export function assertGroupId(id: string): void {
    if (!VALID_GROUP_ID.test(id)) throw new Error(`Group ID inválido: ${id}`);
}

// ─── Estado de módulo (singleton) ────────────────────────────────────────────

export let memCache: FcData | null = null;
export let lastPackedHash: string | null = null;
export let myDeviceId: string | null = null;

export function setMemCache(data: FcData | null): void {
    memCache = data;
}

export function setLastPackedHash(hash: string | null): void {
    lastPackedHash = hash;
}

export function setMyDeviceId(id: string | null): void {
    myDeviceId = id;
}

// ─── Mutexes ─────────────────────────────────────────────────────────────────

/**
 * Mutex en proceso para serializar operaciones read-modify-write sobre fc_meta.
 * Previene race conditions cuando save_words/saveGroup/saveFeatureConfig se llaman concurrentemente.
 */
let metaMutex: Promise<void> = Promise.resolve();
export function withMetaLock<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>(r => { release = r; });
    const prev = metaMutex;
    metaMutex = next;
    return prev.then(fn).finally(() => release!());
}

/** Mutex para serializar operaciones read-modify-write sobre fc_users / fc_ignored. */
let usersMutex: Promise<void> = Promise.resolve();
export function withUsersLock<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>(r => { release = r; });
    const prev = usersMutex;
    usersMutex = next;
    return prev.then(fn).finally(() => release!());
}

/** Mutex por clave de grupo para serializar toggleGroup/setGroupDuration concurrentes. */
const groupLocks = new Map<string, Promise<void>>();
export function withGroupLock<T>(groupId: string, fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>(r => { release = r; });
    const prev = groupLocks.get(groupId) ?? Promise.resolve();
    groupLocks.set(groupId, next);
    return prev.then(fn).finally(() => {
        if (groupLocks.get(groupId) === next) groupLocks.delete(groupId);
        release!();
    });
}

// ─── Listener de invalidación de caché ───────────────────────────────────────

browser.storage.local.onChanged.addListener((changes: Record<string, any>) => {
    const hit = META_KEY in changes ||
        USERS_KEY in changes ||
        IGNORED_KEY in changes ||
        Object.keys(changes).some(k =>
            k.startsWith(FORUM_KEY_PREFIX) || k.startsWith(GROUP_KEY_PREFIX)
        );
    if (hit) memCache = null;
});

// ─── Helpers internos ────────────────────────────────────────────────────────

/**
 * P6: serialización canónica con claves ordenadas.
 * Garantiza que el hash sea idéntico independientemente del orden de inserción
 * de las claves (ej. tras migraciones o unpackFromSync en distinto dispositivo).
 */
export function stableStringify(val: unknown): string {
    if (val === null || typeof val !== 'object') return JSON.stringify(val);
    if (Array.isArray(val)) {
        return '[' + (val as unknown[]).map(stableStringify).join(',') + ']';
    }
    const obj = val as Record<string, unknown>;
    return '{' + Object.keys(obj).sort()
        .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]))
        .join(',') + '}';
}

/** Hash djb2 — rápido, suficiente para comparar snapshots. */
export function hashString(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h |= 0;
    }
    return (h >>> 0).toString(36);
}

// ─── Inicialización del background ───────────────────────────────────────────

/**
 * P2: crea el device ID en el primer arranque y lo cachea en memoria.
 * Llamar desde background.ts en bootstrapLocal().
 */
export async function getOrCreateDeviceId(): Promise<string> {
    if (myDeviceId) return myDeviceId;
    const stored = await browser.storage.local.get(DEVICE_ID_KEY) as Record<string, any>;
    if (stored[DEVICE_ID_KEY]) {
        myDeviceId = stored[DEVICE_ID_KEY] as string;
        return myDeviceId!;
    }
    myDeviceId = crypto.randomUUID();
    await browser.storage.local.set({ [DEVICE_ID_KEY]: myDeviceId });
    return myDeviceId!;
}

/**
 * P4: carga el hash del último packToSync desde storage.local.
 * Llamar desde background.ts antes del primer packToSync.
 */
export async function initPackedHash(): Promise<void> {
    const stored = await browser.storage.local.get(HASH_KEY) as Record<string, any>;
    if (stored[HASH_KEY]) lastPackedHash = stored[HASH_KEY] as string;
}
