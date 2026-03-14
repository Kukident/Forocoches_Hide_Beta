import { browser } from 'wxt/browser';
import { logger } from '@/components/utils/logger';
import { detectVersion, runMigrations } from './migrations';
import {
    META_KEY, FORUM_KEY_PREFIX, GROUP_KEY_PREFIX, USERS_KEY, IGNORED_KEY,
    type FcData, type FcForoData, type FcGroup, type FcUserEntry, type FcMetaStored,
} from './types';
import {
    memCache, setMemCache,
} from './_internal';
import { normalize } from './validation';

// Re-export from _internal for backward compatibility
export { getOrCreateDeviceId, initPackedHash } from './_internal';

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Fuente de verdad. Lee fc_meta y solo las claves indexadas (fc_f_*, fc_g_*).
 * Cascada: caché → local v1 → sync comprimido → migrar v0 desde sync → vacío.
 */
export async function readLocalData(): Promise<FcData> {
    if (memCache) return memCache;

    // 1. v1: leer todo storage.local en una sola llamada y filtrar en JS
    try {
        const all = await browser.storage.local.get(null) as Record<string, any>;
        const meta = all[META_KEY] as any;

        if (meta?.v === 1 || meta?.v === 8) {
            const fids: string[] = meta.fids ?? [];
            const gids: string[] = meta.gids ?? [];

            const f: { [id: string]: FcForoData } = {};
            for (const id of fids) {
                const d = all[`${FORUM_KEY_PREFIX}${id}`] as FcForoData | undefined;
                if (d) f[id] = d;
            }
            const g: { [id: string]: FcGroup } = {};
            for (const id of gids) {
                const d = all[`${GROUP_KEY_PREFIX}${id}`] as FcGroup | undefined;
                if (d) g[id] = d;
            }

            const data = normalize({
                s: meta.s,
                f,
                ...(Object.keys(g).length > 0 ? { g } : {}),
                users: all[USERS_KEY] as Record<string, FcUserEntry> | undefined,
                ignored: all[IGNORED_KEY] as string[] | undefined,
            });
            setMemCache(data);

            logger.info(`Schema v1: ${fids.length} foros, ${gids.length} grupos`);
            return data;
        }
    } catch (err) {
        logger.error('error leyendo v1 de storage.local:', err);
    }

    // 2. Sync comprimido (otro dispositivo) — lazy import to avoid circular dependency
    const { unpackFromSync } = await import('./sync');
    const synced = await unpackFromSync();
    if (synced) {
        logger.info('Cargando datos desde sync (otro dispositivo)');
        await writeLocalData(synced);
        return synced;
    }

    // 3. Datos legacy en sync (v0 u otro formato futuro)
    try {
        const raw = await browser.storage.sync.get(null) as Record<string, any>;
        if (Object.keys(raw).length > 0) {
            const version = detectVersion(raw);
            if (version !== null) {
                const migrated = runMigrations(raw, version);
                if (migrated) {
                    await writeLocalData(migrated);
                    return migrated;
                }
            }
        }
    } catch (err) {
        logger.error('error leyendo storage.sync para migración:', err);
    }

    // 4. Vacío (primera vez) — persistir fc_meta para que futuras escrituras O(1) funcionen
    const data = normalize();
    setMemCache(data);
    await writeLocalData(data);
    return data;
}

/**
 * Persiste FcData en storage.local.
 * Escribe fc_meta (con fids/gids), fc_f_*, fc_g_* y las claves v7 globales.
 * Orphan removal: diff basado en memCache anterior (antes del update optimista).
 */
export async function writeLocalData(data: FcData): Promise<void> {
    const newFids = Object.keys(data.f);
    const newGids = Object.keys(data.g ?? {});
    logger.debug(`Escribiendo: ${newFids.length} foros, ${newGids.length} grupos`);

    // Calcular orphans desde memCache ANTES del update optimista
    const removedFids = Object.keys(memCache?.f ?? {}).filter(id => !data.f[id]);
    const removedGids = Object.keys(memCache?.g ?? {}).filter(id => !(data.g ?? {})[id]);

    setMemCache(data); // update optimista

    const metaValue: FcMetaStored = { v: 1, s: data.s };
    if (newFids.length > 0) metaValue.fids = newFids;
    if (newGids.length > 0) metaValue.gids = newGids;

    const toWrite: Record<string, any> = { [META_KEY]: metaValue };
    for (const [id, foroData] of Object.entries(data.f)) {
        toWrite[`${FORUM_KEY_PREFIX}${id}`] = foroData;
    }
    for (const [id, groupData] of Object.entries(data.g ?? {})) {
        toWrite[`${GROUP_KEY_PREFIX}${id}`] = groupData;
    }
    // Claves globales — omitir si vacías
    if (data.users && Object.keys(data.users).length > 0) toWrite[USERS_KEY] = data.users;
    if (data.ignored && data.ignored.length > 0) toWrite[IGNORED_KEY] = data.ignored;

    // Claves vacías → eliminar
    const emptyGlobalKeys: string[] = [];
    if (!data.users || Object.keys(data.users).length === 0) emptyGlobalKeys.push(USERS_KEY);
    if (!data.ignored || data.ignored.length === 0) emptyGlobalKeys.push(IGNORED_KEY);

    const orphanKeys = [
        ...removedFids.map(id => `${FORUM_KEY_PREFIX}${id}`),
        ...removedGids.map(id => `${GROUP_KEY_PREFIX}${id}`),
        ...emptyGlobalKeys,
    ];

    try {
        await Promise.all([
            browser.storage.local.set(toWrite),
            orphanKeys.length > 0 ? browser.storage.local.remove(orphanKeys) : Promise.resolve(),
        ]);
    } catch (err) {
        setMemCache(null);
        throw err;
    }
}
