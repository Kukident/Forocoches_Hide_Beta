import {
    DEFAULT_FEATURE_CONFIG,
    isGroupExpired,
    type FcData, type FcFeatureConfig,
} from './types';

/** Obtiene los filtros efectivos de un foro: f["*"] + f[foro], respetando c.enabled. */
export function getFilters(data: FcData, foro: string): { banwords: string[]; banusers: string[] } {
    const global = foro !== '*' ? data.f?.['*'] : undefined;
    const foroData = data.f?.[foro];
    return {
        banwords: [
            ...(global && global.c?.enabled !== false ? (global.w ?? []) : []),
            ...(foroData && foroData.c?.enabled !== false ? (foroData.w ?? []) : []),
        ],
        banusers: [
            ...(global && global.c?.enabled !== false ? (global.u ?? []) : []),
            ...(foroData && foroData.c?.enabled !== false ? (foroData.u ?? []) : []),
        ],
    };
}

/** Obtiene los highlight words/users efectivos: f["*"] + f[foro], respetando c.enabled. */
export function getHighlightFilters(data: FcData, foro: string): { highlightwords: string[]; highlightusers: string[] } {
    const global = foro !== '*' ? data.f?.['*'] : undefined;
    const foroData = data.f?.[foro];
    return {
        highlightwords: [
            ...(global && global.c?.enabled !== false ? (global.hw ?? []) : []),
            ...(foroData && foroData.c?.enabled !== false ? (foroData.hw ?? []) : []),
        ],
        highlightusers: [
            ...(global && global.c?.enabled !== false ? (global.hu ?? []) : []),
            ...(foroData && foroData.c?.enabled !== false ? (foroData.hu ?? []) : []),
        ],
    };
}

/** Obtiene los datos crudos de un foro (sin merge con "*"), para UIs de edición. */
export function getRawForumFilters(data: FcData, foro: string) {
    const foroData = data.f?.[foro];
    return {
        banwords: foroData?.w ?? [],
        banusers: foroData?.u ?? [],
        highlightwords: foroData?.hw ?? [],
        highlightusers: foroData?.hu ?? [],
    };
}

/** Devuelve las palabras y usuarios de todos los grupos activos (on: true y no expirados). */
export function getActiveGroupFilters(data: FcData): { banwords: string[]; banusers: string[]; highlightwords: string[]; highlightusers: string[] } {
    const banwords: string[] = [];
    const banusers: string[] = [];
    const highlightwords: string[] = [];
    const highlightusers: string[] = [];
    for (const group of Object.values(data.g ?? {})) {
        if (group.on && !isGroupExpired(group)) {
            if (group.type === 'highlight') {
                highlightwords.push(...(group.hw ?? []));
                highlightusers.push(...(group.hu ?? []));
            } else {
                banwords.push(...(group.w ?? []));
                banusers.push(...(group.u ?? []));
            }
        }
    }
    return { banwords, banusers, highlightwords, highlightusers };
}

/** Devuelve la configuración de funcionalidades, con defaults aplicados. */
export function getFeatureConfig(data: FcData): FcFeatureConfig {
    const stored = data.s.features ?? {};
    return {
        ...DEFAULT_FEATURE_CONFIG,
        ...stored,
        // Migración: filterIndicator → filterIndicatorHide/Highlight
        filterIndicatorHide: (stored as any).filterIndicatorHide ?? (stored as any).filterIndicator ?? DEFAULT_FEATURE_CONFIG.filterIndicatorHide,
        filterIndicatorHighlight: (stored as any).filterIndicatorHighlight ?? (stored as any).filterIndicator ?? DEFAULT_FEATURE_CONFIG.filterIndicatorHighlight,
    };
}
