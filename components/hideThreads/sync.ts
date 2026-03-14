import { browser } from 'wxt/browser';
import LZString from 'lz-string';
import { logger } from '@/components/utils/logger';
import { detectVersion, runMigrations } from './migrations';
import {
    SYNC_META_KEY, SYNC_CHUNK_PREFIX, SYNC_CHUNK_MAX_CHARS, SYNC_MAX_CHUNKS,
    HASH_KEY, LAST_SYNC_KEY, SYNC_QUOTA_BYTES,
    type FcData, type SyncMeta,
} from './types';
import {
    lastPackedHash, setLastPackedHash, stableStringify, hashString,
    getOrCreateDeviceId, initPackedHash,
} from './_internal';

/**
 * Comprime FcData y lo guarda en storage.sync.
 * L4: SYNC_CHUNK_MAX_CHARS = 7900 (era 7000).
 * P4: skip si el hash no cambió. P5: set + remove en paralelo. P2: deviceId en meta.
 */
export async function packToSync(data: FcData): Promise<{ version: number; chunks: number } | null> {
    if (lastPackedHash === null) await initPackedHash();
    const hash = hashString(stableStringify(data));
    if (hash === lastPackedHash) {
        logger.debug('Sync sin cambios, omitiendo escritura');
        return null;
    }

    const deviceId = await getOrCreateDeviceId();

    const json = JSON.stringify(data);
    const compressed = LZString.compressToBase64(json);
    const chunkCount = Math.ceil(compressed.length / SYNC_CHUNK_MAX_CHARS);
    if (chunkCount > SYNC_MAX_CHUNKS) {
        logger.warn(`packToSync requiere ${chunkCount} chunks, máximo ${SYNC_MAX_CHUNKS}. Sync abortado — los datos son demasiado grandes para sincronizar entre dispositivos.`);
        return null;
    }

    const version = Date.now();
    const meta: SyncMeta = { version, chunks: chunkCount, schema: 1, deviceId };
    const toWrite: Record<string, any> = { [SYNC_META_KEY]: meta };

    for (let i = 0; i < chunkCount; i++) {
        toWrite[`${SYNC_CHUNK_PREFIX}${i}`] = compressed.slice(
            i * SYNC_CHUNK_MAX_CHARS,
            (i + 1) * SYNC_CHUNK_MAX_CHARS
        );
    }

    const orphanKeys = Array.from(
        { length: SYNC_MAX_CHUNKS - chunkCount },
        (_, i) => `${SYNC_CHUNK_PREFIX}${chunkCount + i}`
    );

    try {
        await Promise.all([
            browser.storage.sync.set(toWrite),
            orphanKeys.length > 0 ? browser.storage.sync.remove(orphanKeys) : Promise.resolve(),
        ]);
    } catch (err) {
        logger.error('packToSync: error escribiendo en storage.sync (quota?):', err);
        return null;
    }

    setLastPackedHash(hash);
    const now = Date.now();
    await browser.storage.local.set({ [HASH_KEY]: hash, [LAST_SYNC_KEY]: now });

    logger.info(`Sync empaquetado: ${chunkCount} chunks, ~${compressed.length} chars`);
    return { version, chunks: chunkCount };
}

/**
 * Lee y descomprime FcData desde storage.sync.
 * Obtiene meta + todos los chunks posibles en una sola llamada.
 */
export async function unpackFromSync(): Promise<FcData | null> {
    try {
        const allKeys = [
            SYNC_META_KEY,
            ...Array.from({ length: SYNC_MAX_CHUNKS }, (_, i) => `${SYNC_CHUNK_PREFIX}${i}`),
        ];
        const result = await browser.storage.sync.get(allKeys);

        const meta = result[SYNC_META_KEY] as SyncMeta | undefined;
        if (!meta || !meta.chunks) return null;

        const compressed = Array.from(
            { length: meta.chunks },
            (_, i) => result[`${SYNC_CHUNK_PREFIX}${i}`] ?? ''
        ).join('');

        const json = LZString.decompressFromBase64(compressed);
        if (!json) return null;

        const parsed = JSON.parse(json);
        const version = detectVersion(parsed);
        if (version === null) return null;
        return runMigrations(parsed, version);
    } catch (err) {
        logger.error('error en unpackFromSync:', err);
        return null;
    }
}

/** Comprueba la cuota de storage.sync (límite 100 KB). */
export async function checkSyncStorageQuota(): Promise<{ used: number; total: number; percentUsed: number }> {
    try {
        const used = await browser.storage.sync.getBytesInUse(null);
        return { used, total: SYNC_QUOTA_BYTES, percentUsed: Math.round((used / SYNC_QUOTA_BYTES) * 100) };
    } catch {
        return { used: 0, total: SYNC_QUOTA_BYTES, percentUsed: 0 };
    }
}
