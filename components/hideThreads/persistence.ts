import { browser } from 'wxt/browser';
import { logger } from '@/components/utils/logger';
import { createGroupAlarm, clearGroupAlarm } from './groupAlarms';
import {
    META_KEY, FORUM_KEY_PREFIX, GROUP_KEY_PREFIX, USERS_KEY, IGNORED_KEY,
    DEFAULT_FEATURE_CONFIG, isGroupExpired,
    type FcData, type FcForoData, type FcForoConfig, type FcGroup, type FcUserEntry,
    type FcFeatureConfig, type GroupDuration, type FcMetaStored,
} from './types';
import {
    assertForumId, assertGroupId,
    memCache, setMemCache,
    withMetaLock, withUsersLock, withGroupLock,
} from './_internal';

// ─── FilterForm type ─────────────────────────────────────────────────────────

export type FilterForm = 'banwords' | 'banusers' | 'highlightwords' | 'highlightusers';

// ─── saveFeatureConfig ───────────────────────────────────────────────────────

/**
 * Guarda la configuración de funcionalidades (patch parcial).
 * O(1): solo toca fc_meta.
 */
export function saveFeatureConfig(patch: Partial<FcFeatureConfig>): Promise<void> {
    return withMetaLock(async () => {
        const metaResult = await browser.storage.local.get(META_KEY);
        const meta = (metaResult[META_KEY] ?? { v: 1, s: { active: true } }) as FcMetaStored;
        const current = { ...DEFAULT_FEATURE_CONFIG, ...(meta.s.features ?? {}) };
        const updated = { ...current, ...patch };
        const newMeta: FcMetaStored = { ...meta, s: { ...meta.s, features: updated } };
        await browser.storage.local.set({ [META_KEY]: newMeta });

        if (memCache) {
            setMemCache({ ...memCache, s: { ...memCache.s, features: updated } });
        }

        logger.debug('saveFeatureConfig:', patch);
        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── saveGlobalList ──────────────────────────────────────────────────────────

/**
 * Guarda la lista global de ignorados.
 * O(1): solo toca la clave correspondiente.
 */
export function saveGlobalList(
    key: 'ignored',
    value: string[]
): Promise<void> {
    return withUsersLock(async () => {
    const keyMap: Record<string, string> = { ignored: IGNORED_KEY };
    const storageKey = keyMap[key];

    const isEmpty = value.length === 0;

    // Asegurar que fc_meta existe
    const metaResult = await browser.storage.local.get(META_KEY);
    const toWrite: Record<string, any> = {};
    if (!metaResult[META_KEY]) {
        toWrite[META_KEY] = { v: 1, s: { active: true } } as FcMetaStored;
    }

    if (!isEmpty) {
        toWrite[storageKey] = value;
    }

    const toRemove: string[] = isEmpty ? [storageKey] : [];

    await Promise.all([
        Object.keys(toWrite).length > 0 ? browser.storage.local.set(toWrite) : Promise.resolve(),
        toRemove.length > 0 ? browser.storage.local.remove(toRemove) : Promise.resolve(),
    ]);

    // Actualización quirúrgica del memCache
    if (memCache) {
        if (isEmpty) {
            const { [key]: _removed, ...rest } = memCache as any;
            setMemCache(rest as FcData);
        } else {
            setMemCache({ ...memCache, [key]: value } as FcData);
        }
    }

    logger.debug(`saveGlobalList ${key}:`, isEmpty ? '(vacío)' : value);
    browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── saveUser ────────────────────────────────────────────────────────────────

/**
 * Guarda o elimina una entrada de usuario en fc_users.
 * Si entry es null o todos los campos están vacíos, elimina la entrada.
 * O(1): solo toca fc_users.
 */
export function saveUser(username: string, entry: FcUserEntry | null): Promise<void> {
    return withUsersLock(async () => {
    const key = username.toLowerCase();

    const result = await browser.storage.local.get([USERS_KEY, META_KEY]);
    const users: Record<string, FcUserEntry> = (result[USERS_KEY] as Record<string, FcUserEntry>) ?? {};

    if (entry === null) {
        delete users[key];
    } else {
        // Limpiar campos vacíos
        const clean: FcUserEntry = {};
        if (entry.note) clean.note = entry.note;
        if (entry.highlightThread) clean.highlightThread = true;
        if (entry.threadColor) clean.threadColor = entry.threadColor;
        if (entry.highlightPost) clean.highlightPost = true;
        if (entry.postColor) clean.postColor = entry.postColor;

        if (Object.keys(clean).length === 0) {
            delete users[key];
        } else {
            users[key] = clean;
        }
    }

    const toWrite: Record<string, any> = {};

    // Asegurar que fc_meta existe (sin él, readLocalData no encuentra fc_users)
    if (!result[META_KEY]) {
        toWrite[META_KEY] = { v: 1, s: { active: true } } as FcMetaStored;
    }

    if (Object.keys(users).length > 0) {
        toWrite[USERS_KEY] = users;
    }

    const toRemove: string[] = [];
    if (Object.keys(users).length === 0) {
        toRemove.push(USERS_KEY);
    }

    await Promise.all([
        Object.keys(toWrite).length > 0 ? browser.storage.local.set(toWrite) : Promise.resolve(),
        toRemove.length > 0 ? browser.storage.local.remove(toRemove) : Promise.resolve(),
    ]);

    if (memCache) {
        if (Object.keys(users).length > 0) {
            setMemCache({ ...memCache, users });
        } else {
            const { users: _removed, ...rest } = memCache;
            setMemCache(rest as FcData);
        }
    }

    logger.debug(`saveUser ${key}:`, users[key] ?? '(eliminado)');
    browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── saveForumConfig ─────────────────────────────────────────────────────────

/**
 * Guarda la configuración per-foro (patch parcial sobre FcForoConfig).
 * O(1): solo toca fc_f_{id}. Crea la entrada si no existe.
 */
export function saveForumConfig(foroId: string, patch: Partial<FcForoConfig>): Promise<void> {
    assertForumId(foroId);
    return withMetaLock(async () => {
        const foroKey = `${FORUM_KEY_PREFIX}${foroId}`;
        const result = await browser.storage.local.get([META_KEY, foroKey]);
        const foroData: FcForoData = result[foroKey] ?? {};
        const meta = (result[META_KEY] ?? { v: 1, s: { active: true } }) as FcMetaStored;
        const fids = meta.fids ?? [];

        const currentConfig = foroData.c ?? {};
        const updatedConfig = { ...currentConfig, ...patch };
        // No almacenar enabled:true (es el default)
        if (updatedConfig.enabled === true) delete updatedConfig.enabled;
        foroData.c = Object.keys(updatedConfig).length > 0 ? updatedConfig : undefined;
        if (!foroData.c) delete foroData.c;

        const hasData = !!(foroData.w?.length || foroData.u?.length || foroData.hw?.length || foroData.hu?.length || foroData.c);
        const hadForo = fids.includes(foroId);

        const toWrite: Record<string, any> = {};
        const toRemove: string[] = [];

        if (hasData) {
            toWrite[foroKey] = foroData;
            if (!hadForo) {
                toWrite[META_KEY] = { ...meta, fids: [...fids, foroId] };
            }
        } else {
            toRemove.push(foroKey);
            if (hadForo) {
                toWrite[META_KEY] = { ...meta, fids: fids.filter(id => id !== foroId) };
            }
        }

        await Promise.all([
            Object.keys(toWrite).length > 0 ? browser.storage.local.set(toWrite) : Promise.resolve(),
            toRemove.length > 0 ? browser.storage.local.remove(toRemove) : Promise.resolve(),
        ]);

        if (memCache) {
            const f = { ...memCache.f };
            if (hasData) {
                f[foroId] = foroData;
            } else {
                delete f[foroId];
            }
            setMemCache({ ...memCache, f });
        }

        logger.debug(`saveForumConfig foro ${foroId}:`, patch);
        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── saveGroup ───────────────────────────────────────────────────────────────

/**
 * L2 + L3: saveGroup — O(1).
 * Toca solo fc_g_{id} y fc_meta (para actualizar gids).
 * Pasar null como group para borrarlo.
 */
export function saveGroup(groupId: string, group: FcGroup | null): Promise<void> {
    assertGroupId(groupId);
    return withMetaLock(async () => {
        const groupKey = `${GROUP_KEY_PREFIX}${groupId}`;
        const metaResult = await browser.storage.local.get(META_KEY);
        const meta = (metaResult[META_KEY] ?? { v: 1, s: { active: true } }) as FcMetaStored;
        const gids = meta.gids ?? [];

        const toWrite: Record<string, any> = {};
        const toRemove: string[] = [];

        if (group !== null) {
            toWrite[groupKey] = group;
            if (!gids.includes(groupId)) {
                toWrite[META_KEY] = { ...meta, gids: [...gids, groupId] };
            }
        } else {
            toRemove.push(groupKey);
            if (gids.includes(groupId)) {
                toWrite[META_KEY] = { ...meta, gids: gids.filter(id => id !== groupId) };
            }
        }

        await Promise.all([
            Object.keys(toWrite).length > 0 ? browser.storage.local.set(toWrite) : Promise.resolve(),
            toRemove.length > 0 ? browser.storage.local.remove(toRemove) : Promise.resolve(),
        ]);

        if (memCache) {
            const g = { ...(memCache.g ?? {}) };
            if (group !== null) {
                g[groupId] = group;
            } else {
                delete g[groupId];
            }
            setMemCache({ ...memCache, g: Object.keys(g).length > 0 ? g : undefined });
        }

        if (group !== null) {
            logger.debug(`Grupo '${group.name}' guardado (${groupId})`);
        } else {
            clearGroupAlarm(groupId);
            logger.debug(`Grupo ${groupId} eliminado`);
        }

        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── toggleGroup ─────────────────────────────────────────────────────────────

/**
 * L2 + L3: toggleGroup — O(1).
 * Toca solo fc_g_{id} — no lee ni escribe ningún otro dato.
 */
export function toggleGroup(groupId: string): Promise<FcGroup | null> {
    assertGroupId(groupId);
    return withGroupLock(groupId, async () => {
        const key = `${GROUP_KEY_PREFIX}${groupId}`;
        const result = await browser.storage.local.get(key) as Record<string, any>;
        const group: FcGroup | undefined = result[key] as FcGroup | undefined;
        if (!group) return null;

        group.on = !group.on;
        if (group.on) {
            if (group.duration && group.duration !== 'manual') {
                group.activatedAt = Date.now();
            }
            createGroupAlarm(groupId, group);
        } else {
            delete group.activatedAt;
            clearGroupAlarm(groupId);
        }
        logger.debug(`Grupo ${groupId} → ${group.on}`);
        await browser.storage.local.set({ [key]: group });

        if (memCache?.g?.[groupId] !== undefined) {
            setMemCache({ ...memCache, g: { ...memCache.g, [groupId]: group } });
        } else {
            setMemCache(null);
        }

        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
        return { ...group };
    });
}

// ─── setGroupDuration ────────────────────────────────────────────────────────

/**
 * L2 + L3: setGroupDuration — O(1).
 * Actualiza la duración de un grupo activo y reinicia activatedAt.
 * Solo actúa si el grupo existe y está on:true.
 */
export function setGroupDuration(groupId: string, duration: GroupDuration): Promise<void> {
    return withGroupLock(groupId, async () => {
        const key = `${GROUP_KEY_PREFIX}${groupId}`;
        const result = await browser.storage.local.get(key) as Record<string, any>;
        const group: FcGroup | undefined = result[key] as FcGroup | undefined;
        if (!group || !group.on) return;

        if (duration === 'manual') {
            delete group.duration;
            delete group.activatedAt;
        } else {
            group.duration = duration;
            group.activatedAt = Date.now();
        }
        logger.debug(`Duración grupo ${groupId} → ${duration}`);
        await browser.storage.local.set({ [key]: group });

        if (memCache?.g?.[groupId] !== undefined) {
            setMemCache({ ...memCache, g: { ...memCache.g, [groupId]: group } });
        } else {
            setMemCache(null);
        }

        // Actualizar alarma según nueva duración
        if (typeof duration === 'number' && group.on) {
            createGroupAlarm(groupId, group);
        } else {
            clearGroupAlarm(groupId);
        }

        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── setGroupVisible ─────────────────────────────────────────────────────────

/**
 * L2 + L3: setGroupVisible — O(1).
 * Cambia la visibilidad de un grupo en el popup.
 * Si se oculta (visible=false) y estaba activo, también lo desactiva.
 */
export function setGroupVisible(groupId: string, visible: boolean): Promise<FcGroup | null> {
    return withGroupLock(groupId, async () => {
        const key = `${GROUP_KEY_PREFIX}${groupId}`;
        const result = await browser.storage.local.get(key) as Record<string, any>;
        const group: FcGroup | undefined = result[key] as FcGroup | undefined;
        if (!group) return null;

        if (visible) {
            delete group.visible;
        } else {
            group.visible = false;
            if (group.on) {
                group.on = false;
                delete group.activatedAt;
                clearGroupAlarm(groupId);
            }
        }
        await browser.storage.local.set({ [key]: group });

        if (memCache?.g?.[groupId] !== undefined) {
            setMemCache({ ...memCache, g: { ...memCache.g, [groupId]: group } });
        } else {
            setMemCache(null);
        }

        logger.debug(`Grupo ${groupId} visible → ${visible}`);
        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
        return { ...group };
    });
}

// ─── reorderGroups ───────────────────────────────────────────────────────────

/**
 * Reordena los grupos actualizando gids en fc_meta.
 */
export function reorderGroups(orderedGids: string[]): Promise<void> {
    orderedGids.forEach(assertGroupId);
    return withMetaLock(async () => {
        const metaResult = await browser.storage.local.get(META_KEY);
        const meta = (metaResult[META_KEY] ?? { v: 1, s: { active: true } }) as FcMetaStored;
        const currentGids = new Set(meta.gids ?? []);
        const newGids = new Set(orderedGids);
        if (currentGids.size !== newGids.size || [...currentGids].some(id => !newGids.has(id))) {
            logger.warn('reorderGroups: los IDs no coinciden con los grupos existentes, ignorando');
            return;
        }
        meta.gids = orderedGids;
        await browser.storage.local.set({ [META_KEY]: meta });
        setMemCache(null); // invalidar para que readLocalData reconstruya en orden
        logger.debug(`Grupos reordenados: ${orderedGids.join(', ')}`);
        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── save_words ──────────────────────────────────────────────────────────────

export function save_words(foro: string, form: FilterForm, words: string[]): Promise<void> {
    assertForumId(foro);
    return withMetaLock(async () => {
        const fieldMap: Record<FilterForm, keyof FcForoData> = {
            banwords: 'w', banusers: 'u', highlightwords: 'hw', highlightusers: 'hu',
        };
        const fieldKey = fieldMap[form];
        const foroKey = `${FORUM_KEY_PREFIX}${foro}`;

        const result = await browser.storage.local.get([META_KEY, foroKey]);
        const foroData: FcForoData = result[foroKey] ?? {};
        const meta = (result[META_KEY] ?? { v: 1, s: { active: true } }) as FcMetaStored;
        const fids = meta.fids ?? [];

        if (words.length > 0) {
            (foroData as any)[fieldKey] = words;
        } else {
            delete (foroData as any)[fieldKey];
        }

        const hasData = !!(foroData.w?.length || foroData.u?.length || foroData.hw?.length || foroData.hu?.length || foroData.c);
        const hadForo = fids.includes(foro);

        const toWrite: Record<string, any> = {};
        const toRemove: string[] = [];

        if (hasData) {
            toWrite[foroKey] = foroData;
            if (!hadForo) {
                toWrite[META_KEY] = { ...meta, fids: [...fids, foro] };
            }
        } else {
            toRemove.push(foroKey);
            if (hadForo) {
                toWrite[META_KEY] = { ...meta, fids: fids.filter(id => id !== foro) };
            }
        }

        await Promise.all([
            Object.keys(toWrite).length > 0 ? browser.storage.local.set(toWrite) : Promise.resolve(),
            toRemove.length > 0 ? browser.storage.local.remove(toRemove) : Promise.resolve(),
        ]);

        if (memCache) {
            const f = { ...memCache.f };
            if (hasData) {
                f[foro] = foroData;
            } else {
                delete f[foro];
            }
            setMemCache({ ...memCache, f });
        }

        logger.debug(`Guardado ${form} foro ${foro}: ${words.length} elementos`);
        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── save_forum_batch ────────────────────────────────────────────────────────

/**
 * Escribe múltiples campos de un foro en una sola operación atómica.
 * Evita múltiples lecturas/escrituras y envía un solo SCHEDULE_SYNC.
 */
export function save_forum_batch(foro: string, fields: Partial<Record<FilterForm, string[]>>): Promise<void> {
    assertForumId(foro);
    return withMetaLock(async () => {
        const fieldMap: Record<FilterForm, keyof FcForoData> = {
            banwords: 'w', banusers: 'u', highlightwords: 'hw', highlightusers: 'hu',
        };
        const foroKey = `${FORUM_KEY_PREFIX}${foro}`;

        const result = await browser.storage.local.get([META_KEY, foroKey]);
        const foroData: FcForoData = result[foroKey] ?? {};
        const meta = (result[META_KEY] ?? { v: 1, s: { active: true } }) as FcMetaStored;
        const fids = meta.fids ?? [];

        for (const [form, words] of Object.entries(fields) as [FilterForm, string[]][]) {
            const fieldKey = fieldMap[form];
            if (words.length > 0) {
                (foroData as any)[fieldKey] = words;
            } else {
                delete (foroData as any)[fieldKey];
            }
        }

        const hasData = !!(foroData.w?.length || foroData.u?.length || foroData.hw?.length || foroData.hu?.length || foroData.c);
        const hadForo = fids.includes(foro);

        const toWrite: Record<string, any> = {};
        const toRemove: string[] = [];

        if (hasData) {
            toWrite[foroKey] = foroData;
            if (!hadForo) {
                toWrite[META_KEY] = { ...meta, fids: [...fids, foro] };
            }
        } else {
            toRemove.push(foroKey);
            if (hadForo) {
                toWrite[META_KEY] = { ...meta, fids: fids.filter(id => id !== foro) };
            }
        }

        await Promise.all([
            Object.keys(toWrite).length > 0 ? browser.storage.local.set(toWrite) : Promise.resolve(),
            toRemove.length > 0 ? browser.storage.local.remove(toRemove) : Promise.resolve(),
        ]);

        if (memCache) {
            const f = { ...memCache.f };
            if (hasData) {
                f[foro] = foroData;
            } else {
                delete f[foro];
            }
            setMemCache({ ...memCache, f });
        }

        logger.debug(`Guardado batch foro ${foro}: ${Object.entries(fields).map(([k, v]) => `${k}=${(v as string[]).length}`).join(', ')}`);
        browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    });
}

// ─── disableSessionAndExpiredGroups ──────────────────────────────────────────

/**
 * Desactiva los grupos con duración 'session' o con duración por horas expirada.
 * Escribe directamente en fc_g_{id} sin pasar por writeLocalData.
 * Invalida memCache. Retorna true si hubo cambios.
 */
export async function disableSessionAndExpiredGroups(data: FcData): Promise<boolean> {
    const toDisable = Object.entries(data.g ?? {}).filter(
        ([, group]) => group.on && (group.duration === 'session' || isGroupExpired(group))
    );
    if (toDisable.length === 0) return false;

    const toWrite: Record<string, any> = {};
    for (const [id, group] of toDisable) {
        const updated: FcGroup = { ...group, on: false };
        delete updated.activatedAt;
        toWrite[`${GROUP_KEY_PREFIX}${id}`] = updated;
        clearGroupAlarm(id);
    }

    await browser.storage.local.set(toWrite);
    setMemCache(null); // invalidar caché
    logger.info(`Desactivados ${toDisable.length} grupos (sesión/expirados)`);
    browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    return true;
}

// ─── deactivateExpiredGroup ──────────────────────────────────────────────────

/**
 * Desactiva un grupo si está on y ha expirado.
 * Idempotente: si el grupo ya está off, no hace nada.
 * Diseñado para el handler de onAlarm en background.
 */
export async function deactivateExpiredGroup(groupId: string): Promise<boolean> {
    assertGroupId(groupId);
    const key = `${GROUP_KEY_PREFIX}${groupId}`;
    const result = await browser.storage.local.get(key);
    const group = result[key] as FcGroup | undefined;
    if (!group || !group.on) return false;

    group.on = false;
    delete group.activatedAt;
    await browser.storage.local.set({ [key]: group });
    setMemCache(null);
    clearGroupAlarm(groupId);

    logger.info(`Grupo ${groupId} desactivado por alarma`);
    browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {});
    return true;
}

// ─── checkStorageQuota ───────────────────────────────────────────────────────

/** Comprueba la cuota de storage.local (límite ~10MB). */
export async function checkStorageQuota(): Promise<{ used: number; total: number; percentUsed: number }> {
    const used = await browser.storage.local.getBytesInUse(null);
    const total = 10 * 1024 * 1024;
    return { used, total, percentUsed: Math.round((used / total) * 100) };
}
