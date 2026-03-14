// ─── Constantes ──────────────────────────────────────────────────────────────

export const META_KEY             = 'fc_meta';
export const FORUM_KEY_PREFIX     = 'fc_f_';
export const GROUP_KEY_PREFIX     = 'fc_g_';
export const USERS_KEY            = 'fc_users';
export const IGNORED_KEY          = 'fc_ignored';
export const HASH_KEY             = 'fc_hash';
export const DEVICE_ID_KEY        = 'fc_device_id';
export const SYNC_META_KEY        = 'fc_sync_meta';
export const SYNC_CHUNK_PREFIX    = 'fc_sync_c_';
export const SYNC_CHUNK_MAX_CHARS = 7900;             // L4: era 7000; límite Chrome 8192B
export const SYNC_MAX_CHUNKS      = 14;
export const LAST_SYNC_KEY        = 'fc_last_sync';
export const SYNC_QUOTA_BYTES     = 102_400;           // 100 KB — límite storage.sync
export const SYNC_COOLDOWN_MS     = 10 * 60 * 1000;   // 10 minutos entre auto-syncs

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface FcForoConfig {
    enabled?: boolean;
    caseSensitive?: boolean;
    mode?: 'collapse' | 'remove';
}

export interface FcForoData {
    w?: string[];
    u?: string[];
    hw?: string[];   // highlight words (per-forum or global via f["*"])
    hu?: string[];   // highlight users (per-forum or global via f["*"])
    c?: FcForoConfig;
}

export interface FcUserEntry {
    note?: string;
    highlightThread?: boolean;
    threadColor?: string;       // fallback: features.highlightVIPThreadColor
    highlightPost?: boolean;
    postColor?: string;         // fallback: features.highlightVIPPostColor
}

export interface FcFeatureConfig {
    // Ocultar hilos (toggle independiente de s.active)
    hideThreads: boolean;
    // Resaltar hilos (palabras/usuarios propios, listas hw/hu)
    highlightThreads: boolean;
    highlightThreadsColor: string;
    // Indicador de causa (qué filtro activó el ocultado/resaltado)
    filterIndicator: boolean;              // DEPRECATED: migrado a filterIndicatorHide/Highlight
    filterIndicatorHide: boolean;
    filterIndicatorHighlight: boolean;
    // Ignorar usuarios en posts (showthread.php)
    ignoreUsersInPosts: boolean;
    ignoreUsersMode: 'spoiler' | 'hide';
    // Resaltar mensajes del OP
    highlightOP: boolean;
    highlightOPColor: string;
    highlightOPMode: 'background' | 'border';
    // Identificar poles (0 respuestas)
    highlightPoles: boolean;
    highlightPolesColor: string;
    // Notas en usuarios
    userNotes: boolean;
    // Resaltar usuarios VIP en lista de hilos
    highlightVIP: boolean;
    highlightVIPThreadColor: string;
    // Resaltar usuarios VIP en posts
    highlightVIPPosts: boolean;
    highlightVIPPostColor: string;
    highlightVIPPostMode: 'background' | 'border';
    // Proteger hilos de usuarios VIP (no ocultar por filtros)
    protectVIP: boolean;
    // Progreso de lectura en hilos
    readingProgress: boolean;
    // Embeber vídeos WebM inline
    embedWebm: boolean;
}

export const DEFAULT_FEATURE_CONFIG: FcFeatureConfig = {
    hideThreads: true,
    highlightThreads: true,
    highlightThreadsColor: '#fff3cd',
    filterIndicator: true,
    filterIndicatorHide: true,
    filterIndicatorHighlight: true,
    ignoreUsersInPosts: true,
    ignoreUsersMode: 'spoiler',
    highlightOP: true,
    highlightOPColor: '#ca3415',
    highlightOPMode: 'border',
    highlightPoles: true,
    highlightPolesColor: '#e8f8e8',
    userNotes: true,
    highlightVIP: true,
    highlightVIPThreadColor: '#fff0e0',
    highlightVIPPosts: true,
    highlightVIPPostColor: '#fff8e0',
    highlightVIPPostMode: 'border',
    protectVIP: true,
    readingProgress: false,
    embedWebm: true,
};

export interface FcSettings {
    active: boolean;
    features?: FcFeatureConfig;
}

export type GroupDuration = 'manual' | 'session' | number; // number = horas

export interface FcGroup {
    name: string;
    type?: 'hide' | 'highlight';  // undefined = 'hide' (retrocompat)
    w?: string[];
    u?: string[];
    hw?: string[];   // highlight words
    hu?: string[];   // highlight users
    on: boolean;
    duration?: GroupDuration;  // undefined → 'manual'
    activatedAt?: number;      // timestamp ms cuando se activó
    visible?: boolean;         // undefined → true; false = oculto del popup
}

/** Devuelve true si el grupo tiene una duración por horas y ya ha expirado. */
export function isGroupExpired(group: FcGroup): boolean {
    if (!group.on) return false;
    const dur = group.duration;
    if (!dur || dur === 'manual' || dur === 'session') return false;
    if (typeof dur === 'number' && group.activatedAt) {
        return Date.now() > group.activatedAt + dur * 3_600_000;
    }
    return false;
}

export interface FcData {
    v: 1;
    s: FcSettings;
    f: { [foroId: string]: FcForoData };
    g?: { [groupId: string]: FcGroup };
    users?: { [username: string]: FcUserEntry };
    ignored?: string[];
}

/**
 * Forma de fc_meta en storage.local (v7).
 * fids/gids son índices de las claves fc_f_* y fc_g_* que existen.
 */
export interface FcMetaStored {
    v: number;
    s: FcSettings;
    fids?: string[];   // índice de foros con datos
    gids?: string[];   // índice de grupos existentes
}

export interface SyncMeta {
    version: number;
    chunks: number;
    schema: number;
    deviceId?: string;
}

// ─── Registro de foros ───────────────────────────────────────────────────────

export const foros: { [key: string]: (string | number)[] } = {
    "*": ["Todos los foros"],
    "2": ["General"],
    "17": ["Electrónica / Informática"],
    "82": ["Fotografía", 17],
    "23": ["Empleo"],
    "64": ["Taxi", 23],
    "27": ["Viajes"],
    "15": ["Quedadas (KDD)"],
    "4": ["ForoCoches"],
    "18": ["Competición"],
    "20": ["Clásicos"],
    "65": ["Compra - Venta Clasicos", 20],
    "47": ["Monovolumentes"],
    "21": ["4x4 / Ocio"],
    "79": ["Compra - Venta 4x4 / Ocio", 21],
    "28": ["Modelismo"],
    "70": ["Compra - Venta Modelismo", 28],
    "76": ["Camiones / Furgones / Autobuses"],
    "48": ["Motos"],
    "80": ["Compra - Venta Motos", 48],
    "19": ["Mecánica"],
    "5": ["Car-Audio"],
    "31": ["Seguros"],
    "87": ["Promos Seguros", 31],
    "30": ["Tráfico / Radares"],
    "6": ["Tuning"],
    "16": ["Juegos de Coches"],
    "43": ["Juegos Online"],
    "85": ["Plan PIVE"],
    "34": ["Compra - Venta Profesional"],
    "11": ["Compra - Venta Motor"],
    "25": ["Compra - Venta Audio / Tuning"],
    "22": ["Compra - Venta Electrónica"],
    "69": ["Compra - Venta General"],
    "12": ["Info / Ayuda"],
    "8": ["Ayuda"]
};
