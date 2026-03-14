import {
    readLocalData,
    writeLocalData,
    packToSync,
    unpackFromSync,
    getOrCreateDeviceId,
    initPackedHash,
    disableSessionAndExpiredGroups,
    deactivateExpiredGroup,
    saveGlobalList,
    SYNC_META_KEY,
    type SyncMeta,
    LAST_SYNC_KEY,
    SYNC_COOLDOWN_MS,
    validateSyncData,
} from '@/components/hideThreads/storageUtils';
import { syncAllGroupAlarms, getGroupIdFromAlarm } from '@/components/hideThreads/groupAlarms';
import { logger } from '@/components/utils/logger';

const SYNC_ALARM_NAME = 'fc_sync_debounce';
let bootstrapDone = false;
let lastSyncTime = 0;

/**
 * Inicialización al arrancar:
 * - Carga el device ID persistente (P2) y el hash del último pack (P4).
 * - Migra datos legacy si los hay (readLocalData lo hace automáticamente).
 * - Empaqueta a sync solo si hay datos y el hash cambió (packToSync lo decide).
 */
async function bootstrapLocal(): Promise<void> {
    if (bootstrapDone) return;
    bootstrapDone = true;
    logger.debug('Inicializando storage local');
    await Promise.all([getOrCreateDeviceId(), initPackedHash()]);

    // Cargar timestamp del último sync
    const lsResult = await browser.storage.local.get(LAST_SYNC_KEY);
    if (lsResult[LAST_SYNC_KEY]) lastSyncTime = lsResult[LAST_SYNC_KEY] as number;

    let data = await readLocalData();

    // Detectar nueva sesión de navegador y desactivar grupos de sesión/expirados
    try {
        const sessionStorage = (browser.storage as any).session;
        if (sessionStorage) {
            const s = await sessionStorage.get('fc_alive');
            if (!s['fc_alive']) {
                const changed = await disableSessionAndExpiredGroups(data);
                if (changed) {
                    data = await readLocalData(); // releer tras cambios
                    logger.info('Nueva sesión: grupos de sesión/expirados desactivados');
                }
            }
            await sessionStorage.set({ fc_alive: true });
        }
    } catch { /* storage.session no disponible en Firefox MV2 → ignorar */ }

    // Restaurar alarmas de grupos con duración tras reinicio del service worker
    await syncAllGroupAlarms(data);

    await packToSync(data); // null si hash no cambió → sin write a sync
    logger.info(`Bootstrap completo: schema v${data.v}, ${Object.keys(data.f).length} foros, ${Object.keys(data.g ?? {}).length} grupos`);
}

export default defineBackground(() => {
    const actionApi: typeof browser.action | undefined =
        browser.action ?? (browser as any).browserAction;

    browser.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            logger.info('Forocoches+ instalado');
        } else if (details.reason === 'update') {
            const thisVersion = browser.runtime.getManifest().version;
            logger.info(`Actualizado de ${details.previousVersion} a ${thisVersion}`);
        }
        // readLocalData() en bootstrapLocal migra automáticamente v1/v2/v3 → v4
        bootstrapLocal().catch((err) => logger.error('Error en bootstrapLocal:', err));
    });

    bootstrapLocal().catch((err) => logger.error('Error en bootstrapLocal:', err));

    // P2: loop prevention por device ID — robusto ante reinicios del service worker
    browser.storage.sync.onChanged.addListener(async (changes) => {
        if (!changes[SYNC_META_KEY]) return;
        const meta = changes[SYNC_META_KEY].newValue as SyncMeta | undefined;
        if (!meta) return;
        const myId = await getOrCreateDeviceId();
        logger.debug(`Sync recibido de dispositivo ${meta.deviceId}`);
        if (meta.deviceId === myId) {
            logger.debug('Sync propio, ignorando');
            return;
        }
        logger.info('Sincronizando datos de otro dispositivo');
        const raw = await unpackFromSync();
        const data = raw ? validateSyncData(raw) : null;
        if (data) {
            await writeLocalData(data);
        } else if (raw) {
            logger.warn('Datos de sync rechazados por validación');
        }
    });

    // Alarmas: sync debounce + expiración de grupos
    browser.alarms.onAlarm.addListener(async (alarm) => {
        // Sync diferido
        if (alarm.name === SYNC_ALARM_NAME) {
            const data = await readLocalData();
            const result = await packToSync(data);
            if (result) lastSyncTime = Date.now();
            return;
        }

        // Expiración de grupo
        const groupId = getGroupIdFromAlarm(alarm.name);
        if (!groupId) return;

        logger.info(`Alarma de grupo expirado: ${groupId}`);
        const deactivated = await deactivateExpiredGroup(groupId);
        if (!deactivated) return;

        // Notificar pestañas abiertas de forocoches para re-aplicar filtros
        try {
            const tabs = await browser.tabs.query({ url: '*://forocoches.com/foro/*' });
            for (const tab of tabs) {
                if (tab.id !== undefined) {
                    browser.tabs.sendMessage(tab.id, { type: 'RERUN_FILTERS' }).catch(() => {});
                }
            }
        } catch (err) {
            logger.error('Error enviando RERUN_FILTERS tras alarma:', err);
        }
    });

    // Badge con número de hilos ocultados por tab
    browser.runtime.onMessage.addListener((message, sender) => {
        if (message?.type !== 'SET_BADGE') return false;
        const tabId = sender.tab?.id;
        if (tabId === undefined) return false;
        const count: number = message.count ?? 0;
        const isOff: boolean = message.off ?? false;
        const text = isOff ? 'OFF' : (count > 0 ? String(count) : '');
        logger.debug(`Badge tab ${tabId}: "${text}"`);
        if (!actionApi) return false;
        actionApi.setBadgeText({ text, tabId })
            .catch((err) => logger.error('setBadgeText:', err));
        if (count > 0) {
            actionApi.setBadgeBackgroundColor({ color: '#6b7280', tabId })
                .catch((err) => logger.error('setBadgeBackgroundColor:', err));
        } else if (isOff) {
            actionApi.setBadgeBackgroundColor({ color: '#ef4444', tabId })
                .catch((err) => logger.error('setBadgeBackgroundColor:', err));
        }
        return false;
    });

    // Sync diferido desde popup/options (debounced con alarma + cooldown de 10 min)
    browser.runtime.onMessage.addListener((message) => {
        if (message?.type !== 'SCHEDULE_SYNC') return false;
        const elapsed = Date.now() - lastSyncTime;
        const delaySec = elapsed >= SYNC_COOLDOWN_MS ? 3 : Math.max(3, (SYNC_COOLDOWN_MS - elapsed) / 1000);
        const delayInMinutes = Math.max(0.5, delaySec / 60); // mínimo 0.5 min (límite Chrome)
        logger.debug(`Sincronización programada (${Math.round(delaySec)}s)`);
        browser.alarms.create(SYNC_ALARM_NAME, { delayInMinutes });
        return false;
    });

    // Sync forzado manual (sin cooldown) desde Settings
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'FORCE_SYNC') return false;
        (async () => {
            try {
                await browser.alarms.clear(SYNC_ALARM_NAME);
                const data = await readLocalData();
                const result = await packToSync(data);
                const now = Date.now();
                lastSyncTime = now;
                // packToSync solo escribe LAST_SYNC_KEY si el hash cambió;
                // en un sync forzado siempre actualizamos el timestamp
                if (!result) {
                    await browser.storage.local.set({ [LAST_SYNC_KEY]: now });
                }
                sendResponse({ ok: true, lastSync: now });
            } catch (err: any) {
                logger.error('FORCE_SYNC error:', err);
                sendResponse({ ok: false, error: err?.message ?? 'Error desconocido' });
            }
        })();
        return true;
    });

    // Sincronizar lista de ignorados de FC
    const decodeHtmlEntities = (s: string) =>
        s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
         .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
         .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type !== 'SYNC_IGNORELIST') return false;
        (async () => {
            try {
                const res = await fetch(
                    'https://forocoches.com/foro/profile.php?do=ignorelist',
                    { credentials: 'include' }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();

                // Aislar <ul id="ignorelist">...</ul>
                const listMatch = html.match(/<ul[^>]*id=["']ignorelist["'][^>]*>([\s\S]*?)<\/ul>/i);
                if (!listMatch) {
                    sendResponse({ ok: false, error: 'No se encontró la lista de ignorados. ¿Estás logueado?' });
                    return;
                }
                const listHtml = listMatch[1];

                // Extraer usernames de los enlaces member.php
                const userRegex = /<a[^>]*href=["'][^"']*member\.php\?u=\d+["'][^>]*>\s*([^<]+?)\s*<\/a>/gi;
                const users: string[] = [];
                let m;
                while ((m = userRegex.exec(listHtml)) !== null) {
                    const name = decodeHtmlEntities(m[1].trim());
                    if (name) users.push(name);
                }

                await saveGlobalList('ignored', users);
                logger.info(`Ignorelist sincronizada: ${users.length} usuarios`);
                sendResponse({ ok: true, users });
            } catch (err: any) {
                logger.error('Error sincronizando ignorelist:', err);
                sendResponse({ ok: false, error: err?.message ?? 'Error desconocido' });
            }
        })();
        return true; // async sendResponse
    });

    // Deshabilitar icono por defecto, habilitar solo en forocoches.com
    if (actionApi) {
        actionApi.disable().catch(() => {});

        const updateIcon = (tabId: number, url?: string) => {
            if (url && /^https?:\/\/([^/]*\.)?forocoches\.com\//i.test(url)) {
                actionApi.enable(tabId).catch(() => {});
            } else {
                actionApi.disable(tabId).catch(() => {});
            }
        };

        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.url || changeInfo.status === 'complete') {
                updateIcon(tabId, changeInfo.url ?? tab.url);
            }
        });

        // Habilitar en tabs ya abiertos al iniciar
        browser.tabs.query({}).then((tabs) => {
            for (const tab of tabs) {
                if (tab.id !== undefined) updateIcon(tab.id, tab.url);
            }
        }).catch(() => {});
    }
});
