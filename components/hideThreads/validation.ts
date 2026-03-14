import {
    DEFAULT_FEATURE_CONFIG,
    type FcData, type FcForoData, type FcForoConfig, type FcGroup, type FcUserEntry, type FcFeatureConfig,
} from './types';

// ─── Validación post-migración (import / sync) ──────────────────────────────

function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every(v => typeof v === 'string');
}

function isValidForoData(val: unknown): val is FcForoData {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
    const d = val as Record<string, unknown>;
    if (d.w !== undefined && !isStringArray(d.w)) return false;
    if (d.u !== undefined && !isStringArray(d.u)) return false;
    if (d.hw !== undefined && !isStringArray(d.hw)) return false;
    if (d.hu !== undefined && !isStringArray(d.hu)) return false;
    if (d.c !== undefined) {
        if (typeof d.c !== 'object' || d.c === null || Array.isArray(d.c)) return false;
    }
    return true;
}

function isValidUserEntry(val: unknown): val is FcUserEntry {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
    const e = val as Record<string, unknown>;
    if (e.note !== undefined && typeof e.note !== 'string') return false;
    if (e.highlightThread !== undefined && typeof e.highlightThread !== 'boolean') return false;
    if (e.threadColor !== undefined && typeof e.threadColor !== 'string') return false;
    if (e.highlightPost !== undefined && typeof e.highlightPost !== 'boolean') return false;
    if (e.postColor !== undefined && typeof e.postColor !== 'string') return false;
    return true;
}

function isValidGroup(val: unknown): val is FcGroup {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
    const g = val as Record<string, unknown>;
    if (typeof g.name !== 'string') return false;
    if (typeof g.on !== 'boolean') return false;
    if (g.type !== undefined && g.type !== 'hide' && g.type !== 'highlight') return false;
    if (g.w !== undefined && !isStringArray(g.w)) return false;
    if (g.u !== undefined && !isStringArray(g.u)) return false;
    if (g.hw !== undefined && !isStringArray(g.hw)) return false;
    if (g.hu !== undefined && !isStringArray(g.hu)) return false;
    if (g.duration !== undefined && g.duration !== 'manual' && g.duration !== 'session' && typeof g.duration !== 'number') return false;
    if (g.activatedAt !== undefined && typeof g.activatedAt !== 'number') return false;
    if (g.visible !== undefined && typeof g.visible !== 'boolean') return false;
    return true;
}

/**
 * Valida que un objeto FcData post-migración cumpla las invariantes del schema v1.
 * Devuelve un array de errores (vacío si todo OK).
 */
export function validateFcData(data: unknown): string[] {
    const errors: string[] = [];
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return ['data no es un objeto'];
    }
    const d = data as Record<string, unknown>;

    // Versión
    if (d.v !== 1) errors.push(`v debe ser 1, es ${d.v}`);

    // Settings
    if (typeof d.s !== 'object' || d.s === null || Array.isArray(d.s)) {
        errors.push('s no es un objeto');
    } else {
        const s = d.s as Record<string, unknown>;
        if (typeof s.active !== 'boolean') errors.push('s.active no es boolean');
    }

    // Forums
    if (typeof d.f !== 'object' || d.f === null || Array.isArray(d.f)) {
        errors.push('f no es un objeto');
    } else {
        for (const [key, val] of Object.entries(d.f as Record<string, unknown>)) {
            if (!isValidForoData(val)) errors.push(`f["${key}"] no es un FcForoData válido`);
        }
    }

    // Groups (optional)
    if (d.g !== undefined) {
        if (typeof d.g !== 'object' || d.g === null || Array.isArray(d.g)) {
            errors.push('g no es un objeto');
        } else {
            for (const [key, val] of Object.entries(d.g as Record<string, unknown>)) {
                if (!isValidGroup(val)) errors.push(`g["${key}"] no es un FcGroup válido`);
            }
        }
    }

    // Users (optional)
    if (d.users !== undefined) {
        if (typeof d.users !== 'object' || d.users === null || Array.isArray(d.users)) {
            errors.push('users no es un objeto');
        } else {
            for (const [key, val] of Object.entries(d.users as Record<string, unknown>)) {
                if (!isValidUserEntry(val)) errors.push(`users["${key}"] no es un FcUserEntry válido`);
            }
        }
    }

    // Ignored (optional)
    if (d.ignored !== undefined && !isStringArray(d.ignored)) {
        errors.push('ignored no es un array de strings');
    }

    return errors;
}

export function normalize(partial: Partial<FcData> = {}): FcData {
    const f = partial.f ? { ...partial.f } : {};
    const users = partial.users ? { ...partial.users } : undefined;

    const result: FcData = {
        v: 1,
        s: {
            active: partial.s?.active ?? true,
            features: Object.fromEntries(
                Object.keys(DEFAULT_FEATURE_CONFIG).map(k => [
                    k,
                    (partial.s?.features as any)?.[k] ?? (DEFAULT_FEATURE_CONFIG as any)[k],
                ])
            ) as FcFeatureConfig,
        },
        f,
    };
    if (partial.g && Object.keys(partial.g).length > 0) {
        result.g = partial.g;
    }
    if (users && Object.keys(users).length > 0) {
        result.users = users;
    }
    if (partial.ignored && partial.ignored.length > 0) {
        result.ignored = partial.ignored;
    }
    // vip/notes/hw/hu ya no se almacenan a nivel superior
    return result;
}

// ─── Validación de datos sincronizados ──────────────────────────────────────

const isStrArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every(i => typeof i === 'string');

const MAX_ARRAY_LEN = 5000;
const MAX_STRING_LEN = 500;
const MAX_ENTRIES = 2000;

function sanitizeStringArray(arr: unknown): string[] | undefined {
    if (!isStrArray(arr)) return undefined;
    return arr.slice(0, MAX_ARRAY_LEN).map(s => s.slice(0, MAX_STRING_LEN));
}

function validateForoData(data: unknown): FcForoData | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    const result: FcForoData = {};
    const w = sanitizeStringArray(d.w);
    const u = sanitizeStringArray(d.u);
    const hw = sanitizeStringArray(d.hw);
    const hu = sanitizeStringArray(d.hu);
    if (w?.length) result.w = w;
    if (u?.length) result.u = u;
    if (hw?.length) result.hw = hw;
    if (hu?.length) result.hu = hu;
    if (d.c && typeof d.c === 'object') {
        const c = d.c as Record<string, unknown>;
        const config: FcForoConfig = {};
        if (typeof c.enabled === 'boolean') config.enabled = c.enabled;
        if (typeof c.caseSensitive === 'boolean') config.caseSensitive = c.caseSensitive;
        if (c.mode === 'collapse' || c.mode === 'remove') config.mode = c.mode;
        if (Object.keys(config).length > 0) result.c = config;
    }
    return Object.keys(result).length > 0 ? result : null;
}

function validateGroup(data: unknown): FcGroup | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    if (typeof d.name !== 'string' || !d.name) return null;
    if (typeof d.on !== 'boolean') return null;
    const result: FcGroup = { name: d.name.slice(0, MAX_STRING_LEN), on: d.on };
    if (d.type === 'hide' || d.type === 'highlight') result.type = d.type;
    const w = sanitizeStringArray(d.w);
    const u = sanitizeStringArray(d.u);
    const hw = sanitizeStringArray(d.hw);
    const hu = sanitizeStringArray(d.hu);
    if (w?.length) result.w = w;
    if (u?.length) result.u = u;
    if (hw?.length) result.hw = hw;
    if (hu?.length) result.hu = hu;
    if (d.duration === 'manual' || d.duration === 'session' || typeof d.duration === 'number') {
        result.duration = d.duration;
    }
    if (typeof d.activatedAt === 'number') result.activatedAt = d.activatedAt;
    if (typeof d.visible === 'boolean') result.visible = d.visible;
    return result;
}

function validateUserEntry(data: unknown): FcUserEntry | null {
    if (!data || typeof data !== 'object') return null;
    const d = data as Record<string, unknown>;
    const result: FcUserEntry = {};
    if (typeof d.note === 'string') result.note = d.note.slice(0, MAX_STRING_LEN);
    if (typeof d.highlightThread === 'boolean') result.highlightThread = d.highlightThread;
    if (typeof d.threadColor === 'string') result.threadColor = d.threadColor.slice(0, 20);
    if (typeof d.highlightPost === 'boolean') result.highlightPost = d.highlightPost;
    if (typeof d.postColor === 'string') result.postColor = d.postColor.slice(0, 20);
    return Object.keys(result).length > 0 ? result : null;
}

/** Valida y sanitiza datos recibidos de sync. Devuelve null si son irrecuperables. */
export function validateSyncData(raw: unknown): FcData | null {
    if (!raw || typeof raw !== 'object') return null;
    const d = raw as Record<string, unknown>;
    if (d.v !== 1) return null;
    if (!d.s || typeof d.s !== 'object') return null;

    // Foros
    const f: FcData['f'] = {};
    if (d.f && typeof d.f === 'object') {
        let count = 0;
        for (const [id, foro] of Object.entries(d.f as Record<string, unknown>)) {
            if (count >= MAX_ENTRIES) break;
            if (!/^[a-zA-Z0-9_*-]+$/.test(id)) continue;
            const validated = validateForoData(foro);
            if (validated) { f[id] = validated; count++; }
        }
    }

    // Grupos
    let g: FcData['g'] | undefined;
    if (d.g && typeof d.g === 'object') {
        g = {};
        let count = 0;
        for (const [id, group] of Object.entries(d.g as Record<string, unknown>)) {
            if (count >= MAX_ENTRIES) break;
            const validated = validateGroup(group);
            if (validated) { g[id] = validated; count++; }
        }
        if (Object.keys(g).length === 0) g = undefined;
    }

    // Usuarios
    let users: FcData['users'] | undefined;
    if (d.users && typeof d.users === 'object') {
        users = {};
        let count = 0;
        for (const [name, entry] of Object.entries(d.users as Record<string, unknown>)) {
            if (count >= MAX_ENTRIES) break;
            const validated = validateUserEntry(entry);
            if (validated) { users[name.slice(0, MAX_STRING_LEN)] = validated; count++; }
        }
        if (Object.keys(users).length === 0) users = undefined;
    }

    // Ignored
    let ignored: string[] | undefined;
    if (Array.isArray(d.ignored)) {
        ignored = sanitizeStringArray(d.ignored);
        if (!ignored?.length) ignored = undefined;
    }

    const result = normalize({ v: 1, s: d.s as FcData['s'], f, g, users, ignored });
    return result;
}
