import { normalize } from '../validation';
import type { FcData } from '../types';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Migration {
    from: number;
    to: number;
    migrate(data: any): FcData;
}

// ─── Registro ────────────────────────────────────────────────────────────────

import { v0Migration } from './v0';

const migrations: Migration[] = [v0Migration];

export const CURRENT_VERSION = 1;

// ─── Detección de versión ────────────────────────────────────────────────────

/**
 * Detecta la versión de un objeto de datos.
 * - FcData (v1+): campo `v`
 * - v0 (formato plano pre-WXT): devuelve 0
 * - Desconocido: null
 */
export function detectVersion(raw: Record<string, any>): number | null {
    if (typeof raw.v === 'number') {
        // v8 era el esquema original pre-renumeración → equivale a v1
        if (raw.v === 8) return 1;
        return raw.v;
    }
    // v0: claves planas o key "filtrar"
    if (raw['filtrar'] || Object.keys(raw).some(k => /^f_\w+_(banwords|banusers)_\d+$/.test(k))) {
        return 0;
    }
    return null;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

/**
 * Ejecuta la cadena de migraciones desde `fromVersion` hasta CURRENT_VERSION.
 * Devuelve null si no hay ruta de migración posible.
 */
export function runMigrations(raw: Record<string, any>, fromVersion: number): FcData | null {
    if (fromVersion === CURRENT_VERSION) return normalize(raw as Partial<FcData>);

    let data: any = raw;
    let currentV = fromVersion;

    while (currentV < CURRENT_VERSION) {
        const migration = migrations.find(m => m.from === currentV);
        if (!migration) return null;
        data = migration.migrate(data);
        currentV = migration.to;
    }

    return data;
}
