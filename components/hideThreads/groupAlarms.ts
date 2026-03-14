import { browser } from 'wxt/browser';
import { logger } from '@/components/utils/logger';
import type { FcData, FcGroup } from './types';

export const ALARM_PREFIX = 'fc_group_';

/** Mínimo delay permitido por Chrome (1 min en producción, 0.5 en dev). */
const MIN_DELAY_MINUTES = 0.5;

function alarmName(groupId: string): string {
    return `${ALARM_PREFIX}${groupId}`;
}

/** Extrae el groupId del nombre de alarma, o null si no coincide. */
export function getGroupIdFromAlarm(name: string): string | null {
    if (!name.startsWith(ALARM_PREFIX)) return null;
    return name.slice(ALARM_PREFIX.length);
}

/** Comprueba si browser.alarms está disponible (solo en background). */
function hasAlarmsApi(): boolean {
    return typeof browser !== 'undefined' && !!browser.alarms;
}

/**
 * Crea una alarma para desactivar un grupo cuando expire.
 * Solo actúa si el grupo está on, tiene duración numérica y activatedAt.
 * Es seguro llamar desde cualquier contexto (no-op si no hay API alarms).
 */
export function createGroupAlarm(groupId: string, group: FcGroup): void {
    if (!hasAlarmsApi()) return;
    if (!group.on || !group.activatedAt) return;

    const dur = group.duration;
    if (!dur || dur === 'manual' || dur === 'session' || typeof dur !== 'number') return;

    const expiresAt = group.activatedAt + dur * 3_600_000;
    const remainingMs = expiresAt - Date.now();
    const delayInMinutes = Math.max(MIN_DELAY_MINUTES, remainingMs / 60_000);

    browser.alarms.create(alarmName(groupId), { delayInMinutes });
    logger.debug(`Alarma creada: grupo ${groupId} expira en ${Math.round(delayInMinutes)} min`);
}

/**
 * Elimina la alarma de un grupo.
 * Seguro llamar desde cualquier contexto.
 */
export function clearGroupAlarm(groupId: string): void {
    if (!hasAlarmsApi()) return;
    browser.alarms.clear(alarmName(groupId)).catch(() => {});
}

/**
 * Sincroniza todas las alarmas de grupos con el estado actual de FcData.
 * Limpia alarmas obsoletas y crea las necesarias.
 * Llamar en bootstrap del background para restaurar alarmas tras reinicio del SW.
 */
export async function syncAllGroupAlarms(data: FcData): Promise<void> {
    if (!hasAlarmsApi()) return;

    // Limpiar alarmas existentes de grupos
    try {
        const all = await browser.alarms.getAll();
        const groupAlarms = all.filter(a => a.name.startsWith(ALARM_PREFIX));
        await Promise.all(groupAlarms.map(a => browser.alarms.clear(a.name)));
    } catch (err) {
        logger.error('Error limpiando alarmas de grupos:', err);
    }

    // Crear alarmas para grupos activos con duración
    const groups = data.g ?? {};
    let created = 0;
    for (const [id, group] of Object.entries(groups)) {
        if (group.on && group.activatedAt && typeof group.duration === 'number') {
            createGroupAlarm(id, group);
            created++;
        }
    }
    if (created > 0) {
        logger.info(`${created} alarma(s) de grupo restauradas`);
    }
}
