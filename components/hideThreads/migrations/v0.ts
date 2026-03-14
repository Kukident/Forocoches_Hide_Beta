import type { Migration } from './index';
import { normalize } from '../validation';
import type { FcData, FcForoData } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function unescapeRegExp(text: string): string {
    return text.replace(/\\([-[\]{}()*+?.\\^$|#\s])/g, '$1');
}

/**
 * Parsea claves planas chunked `f_{foroId}_{banwords|banusers}_{chunk}`.
 * Retorna un mapa foroId → { banwords concatenados, banusers concatenados }.
 */
function parseFlatKeys(raw: Record<string, any>): Record<string, { bw: string[]; bu: string[] }> {
    const keyPattern = /^f_(\w+)_(banwords|banusers)_(\d+)$/;
    const buckets: Record<string, { banwords: Record<number, string[]>; banusers: Record<number, string[]> }> = {};

    for (const key of Object.keys(raw)) {
        const m = key.match(keyPattern);
        if (!m) continue;
        const [, foroId, type, chunkStr] = m;
        const chunk = parseInt(chunkStr, 10);
        if (!buckets[foroId]) buckets[foroId] = { banwords: {}, banusers: {} };
        if (Array.isArray(raw[key])) {
            buckets[foroId][type as 'banwords' | 'banusers'][chunk] = raw[key];
        }
    }

    const result: Record<string, { bw: string[]; bu: string[] }> = {};
    for (const foroId of Object.keys(buckets)) {
        result[foroId] = {
            bw: Object.entries(buckets[foroId].banwords)
                .sort(([a], [b]) => Number(a) - Number(b))
                .flatMap(([, arr]) => arr),
            bu: Object.entries(buckets[foroId].banusers)
                .sort(([a], [b]) => Number(a) - Number(b))
                .flatMap(([, arr]) => arr),
        };
    }
    return result;
}

// ─── Migración v0 → v1 ─────────────────────────────────────────────────────

/**
 * Importa datos de la extensión antigua (v0, pre-WXT).
 * Formato: claves planas `f_{foroId}_{banwords|banusers}_{chunk}` + `filtrar.options`.
 * Las palabras se des-escapan porque la v0 aplicaba escapeRegExp al guardar
 * (la versión actual aplica escape al leer en content.ts).
 */
export function importLegacy(raw: Record<string, any>): FcData {
    const data = normalize();

    if (raw['filtrar']?.options) {
        const opts = raw['filtrar'].options;
        if (typeof opts.active === 'boolean') data.s.active = opts.active;
    }

    const parsed = parseFlatKeys(raw);
    for (const foroId of Object.keys(parsed)) {
        const { bw, bu } = parsed[foroId];
        const entry: FcForoData = {};
        if (bw.length) entry.w = bw.map(unescapeRegExp);
        if (bu.length) entry.u = bu.map(unescapeRegExp);
        if (entry.w || entry.u) data.f[foroId] = entry;
    }

    return data;
}

export const v0Migration: Migration = {
    from: 0,
    to: 1,
    migrate: importLegacy,
};
