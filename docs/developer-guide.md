# Forocoches+ — Guía para desarrolladores

## Índice

1. [Visión general](#1-visión-general)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Entrypoints y content scripts](#4-entrypoints-y-content-scripts)
5. [Sistema de almacenamiento (v1)](#5-sistema-de-almacenamiento-v1)
6. [API de storageUtils](#6-api-de-storageutils)
7. [Background service worker](#7-background-service-worker)
8. [Componentes UI](#8-componentes-ui)
9. [Detección de tema](#9-detección-de-tema)
10. [Ocultación de hilos](#10-ocultación-de-hilos)
11. [Funcionalidades en posts](#11-funcionalidades-en-posts)
12. [Modos rápidos (grupos de filtros)](#12-modos-rápidos-grupos-de-filtros)
13. [Flujo de datos end-to-end](#13-flujo-de-datos-end-to-end)
14. [Convenciones de código](#14-convenciones-de-código)
15. [Añadir un nuevo foro](#15-añadir-un-nuevo-foro)

---

## 1. Visión general

**Forocoches+** es una extensión de navegador (Chrome MV3 / Firefox MV3) que filtra, oculta y resalta hilos en [forocoches.com](https://forocoches.com) según:

- **Filtros por subforo**: listas de palabras clave y nombres de usuario configuradas por subforo.
- **Modos rápidos**: grupos de filtros globales activables/desactivables desde el popup sin recargar la página.
- **Resaltado**: destaca hilos/posts por palabras, usuarios VIP, OP, poles.
- **Usuarios**: notas personales, colores per-user en hilos y posts.

Los ajustes se persisten en `storage.local` (claves separadas por foro/grupo) y se sincronizan entre dispositivos mediante un snapshot comprimido en `storage.sync`.

---

## 2. Estructura del proyecto

```
forocoches-hide/
├── assets/                              # Iconos fuente (SVG)
├── components/
│   ├── utils/
│   │   ├── forumStyle.ts                # Detección de tema (old/new)
│   │   └── logger.ts                    # Utilidad de logging
│   ├── composables/
│   │   └── useRefreshOnVisible.ts       # Vue composable: refresh al volver a pestaña
│   ├── posts/                           # Módulos para showthread.php
│   │   ├── domHelpers.ts                # getPostContainers, getPostAuthor, getThreadOP...
│   │   ├── postDecorations.ts           # wrapWithSpoiler, hidePostFully, highlightPostContainer...
│   │   ├── postFeatures.ts              # applyPostFeatures (orquestador)
│   │   ├── videoEmbed.ts                # embedVideos (WebM/MP4)
│   │   └── readingProgress.ts           # Progreso de lectura (desactivado)
│   ├── hideThreads/
│   │   ├── storageUtils.ts              # ★ Barrel (re-export de todos los módulos)
│   │   ├── types.ts                     # Constantes, interfaces, DEFAULT_FEATURE_CONFIG, foros
│   │   ├── _internal.ts                 # Estado singleton, mutexes, hash helpers (NO re-exportado)
│   │   ├── validation.ts                # normalize, validateFcData, validateSyncData
│   │   ├── readWrite.ts                 # readLocalData, writeLocalData
│   │   ├── sync.ts                      # packToSync, unpackFromSync
│   │   ├── accessors.ts                 # getFilters, getHighlightFilters, getFeatureConfig...
│   │   ├── persistence.ts               # save_words, saveGroup, toggleGroup, saveUser...
│   │   ├── utils.ts                     # GetURLParameter, escapeRegExp
│   │   ├── groupUtils.ts                # getRemainingLabel (compartido popup/options)
│   │   ├── groupAlarms.ts               # Alarmas para expiración de grupos
│   │   ├── shared.ts                    # Helpers compartidos hide/highlight
│   │   ├── migrations/                  # Migraciones de schema
│   │   │   ├── index.ts                 # detectVersion, runMigrations
│   │   │   └── v0.ts                    # Migración v0 → v1
│   │   ├── oldTheme/
│   │   │   ├── hideThreads.ts           # Lógica de ocultación tema viejo
│   │   │   └── injectPostListElements.ts
│   │   └── newTheme/
│   │       ├── hideThreads.ts           # Lógica de ocultación tema nuevo
│   │       └── injectPostListElements.ts
│   ├── PopupForm.vue                    # Formulario reutilizable popup
│   ├── TagsInput.vue                    # Componente de tags
│   └── ColorPicker.vue                  # Selector de color con swatches
├── entrypoints/
│   ├── background.ts                    # Service worker
│   ├── content.ts                       # Content script: forumdisplay.php
│   ├── posts.content.ts                 # Content script: showthread.php (orquestador)
│   ├── posts-reply.content.ts           # Content script: newreply/newthread (Imgur upload)
│   ├── popup/
│   │   ├── App.vue                      # UI del popup
│   │   └── index.html
│   └── options/
│       ├── App.vue
│       ├── router.ts                    # Vue Router
│       ├── index.html
│       ├── components/                  # Componentes compartidos entre páginas
│       │   ├── ForumCards.vue           # Cards por foro (prop mode: hide|highlight)
│       │   └── Groups.vue              # Gestión de grupos (prop mode: hide|highlight)
│       ├── pages/
│       │   ├── Dashboard.vue            # Panel de control
│       │   ├── Forum.vue                # Ocultar: toggle + ForumCards + Groups
│       │   ├── Resaltar.vue             # Resaltar: ForumCards + Groups + VIP colors
│       │   ├── Threads.vue              # Posts: ignore users, highlight OP
│       │   ├── Usuarios.vue             # VIP + notas unificados
│       │   ├── Settings.vue             # Export / import / reset
│       │   └── About.vue               # Info + ayuda
│       └── partials/
│           ├── Aside.vue                # Sidebar con navegación
│           ├── Nav.vue
│           └── Main.vue
├── public/                              # Iconos de extensión
├── docs/
│   ├── developer-guide.md               # Este archivo
│   ├── competitive-analysis.md
│   ├── feature-research.md
│   ├── FEATURE_SUMMARY.md
│   └── wrapped-stats-plan.md
├── test/
│   ├── fixtures/html/                   # HTML snapshots para testing
│   ├── setup.ts
│   └── storageUtils.test.ts
├── wxt.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

---

## 3. Stack tecnológico

| Tecnología | Uso |
|---|---|
| [WXT](https://wxt.dev) | Framework de build para extensiones (MV3) |
| Vue 3 + TypeScript | UI del popup y página de opciones |
| Tailwind CSS + Flowbite | Estilos y componentes UI |
| Vanilla TS | Content scripts (sin framework) |
| lz-string | Compresión Base64 del snapshot de sync |
| Vite | Bundler subyacente (gestionado por WXT) |
| Vitest | Testing |

---

## 4. Entrypoints y content scripts

### `entrypoints/content.ts`

Se inyecta en `forumdisplay.php?f=*`. Es el script principal de ocultación.

Flujo:
1. Detecta el tema del foro (`getForumStyle()`)
2. Inyecta el HTML del menú (`manageOldThemeHtml` / `manageNewThemeHtml`)
3. Lee los filtros con `readLocalData()`
4. **Fusiona** filtros del subforo (`getFilters`) + filtros de grupos activos (`getActiveGroupFilters`)
5. Construye expresiones regulares y llama a `hideOldThemeThreads` / `hideNewThemeThreads`
6. Registra un listener para el mensaje `RERUN_FILTERS`, que repite los pasos 3–5 sin recargar la página.

### `entrypoints/posts.content.ts`

Se inyecta en `showthread.php`. Orquestador ligero (~150 líneas) que delega a módulos en `components/posts/`:

1. Lee datos con `readLocalData()` y detecta el tema
2. Aplica features per-post (`applyPostFeatures`) — ignore, highlight OP/VIP, notas
3. Embebe vídeos WebM/MP4 si `embedWebm` está habilitado
4. Gestiona reading progress (actualmente desactivado)
5. Escucha mensajes: `GET_THREAD_INFO`, `RERUN_FILTERS`, `GET_READING_PROGRESS`, `SCROLL_TO_POST`

### `entrypoints/posts-reply.content.ts`

Se inyecta en `newreply.php`, `newthread.php` y `showthread.php`. Permite arrastrar imágenes al editor de respuestas y subirlas automáticamente a Imgur.

---

## 5. Sistema de almacenamiento (v1)

### Arquitectura de claves en `storage.local`

Los datos se reparten en claves separadas para lecturas/escrituras O(1):

```
fc_meta          →  { v: 1, s: FcSettings, fids?: string[], gids?: string[] }
fc_f_{foroId}    →  { w?, u?, hw?, hu?, c?: FcForoConfig }
fc_g_{groupId}   →  { name, type?, w?, u?, hw?, hu?, on, duration?, activatedAt?, visible? }
fc_users         →  { [username]: FcUserEntry }
fc_hash          →  "djb2hash"
fc_device_id     →  "uuid"
```

### Tipos principales

```ts
interface FcData {
  v: 1;
  s: FcSettings;                           // { active, features?: FcFeatureConfig }
  f: { [foroId: string]: FcForoData };
  g?: { [groupId: string]: FcGroup };
  users?: { [username: string]: FcUserEntry };
  ignored?: string[];
}

interface FcForoData {
  w?: string[];        // banwords
  u?: string[];        // banusers
  hw?: string[];       // highlight words
  hu?: string[];       // highlight users
  c?: FcForoConfig;    // per-forum config (enabled, caseSensitive, mode)
}

interface FcGroup {
  name: string;
  type?: 'hide' | 'highlight';  // undefined = 'hide'
  w?: string[];    u?: string[];    // hide words/users
  hw?: string[];   hu?: string[];   // highlight words/users
  on: boolean;
  duration?: GroupDuration;    // 'manual' | 'session' | number (hours)
  activatedAt?: number;
  visible?: boolean;           // false = hidden from popup
}

interface FcUserEntry {
  note?: string;
  highlightThread?: boolean;   threadColor?: string;
  highlightPost?: boolean;     postColor?: string;
}
```

Decisiones de diseño:
- **Nombres compactos** (`v`, `s`, `f`, `w`, `u`): reducen el tamaño del JSON.
- **Arrays opcionales**: si `w` o `u` están vacíos, la clave no se almacena. Si un foro/grupo/usuario queda sin datos, su entrada se elimina.
- **Grupos en fc_g_{id}**: cada grupo tiene su propia clave, indexados por `gids` en `fc_meta`.
- **fc_users**: clave única para todos los usuarios VIP/notas.

### Snapshot en `storage.sync`

```
fc_sync_meta  →  { version: timestamp, chunks: N, schema: 1, deviceId: "uuid" }
fc_sync_c_0   →  "base64-lz-string..."
...           (hasta 14 chunks × 7900 chars)
```

### Cascada de lectura (`readLocalData`)

```
1. Caché en memoria (memCache)
        ↓ (miss)
2. fc_meta con v === 1 + fc_f_* + fc_g_* + fc_users → normalize → return
        ↓ (no existe)
3. unpackFromSync() → descomprime desde storage.sync → writeLocalData
        ↓ (no hay sync)
4. storage.sync legacy → detectVersion + runMigrations → writeLocalData
        ↓ (nada)
5. normalize() → estructura vacía → writeLocalData (persiste fc_meta)
```

---

## 6. API de storageUtils

El barrel `storageUtils.ts` re-exporta desde módulos especializados. **Nunca llamar directamente a `browser.storage.sync.get/set` desde componentes UI.**

### Lectura y escritura global (`readWrite.ts`)

```ts
readLocalData(): Promise<FcData>
writeLocalData(data: FcData): Promise<void>
getOrCreateDeviceId(): Promise<string>
initPackedHash(): Promise<void>
```

### Validación y normalización (`validation.ts`)

```ts
normalize(partial?: Partial<FcData>): FcData
validateFcData(data: unknown): string[]
validateSyncData(raw: unknown): FcData | null
```

### Sync comprimido (`sync.ts`)

```ts
packToSync(data: FcData): Promise<{ version: number; chunks: number } | null>
unpackFromSync(): Promise<FcData | null>
checkSyncStorageQuota(): Promise<{ used, total, percentUsed }>
```

### Accessors (`accessors.ts`)

```ts
getFilters(data, foro): { banwords, banusers }
getHighlightFilters(data, foro): { highlightwords, highlightusers }
getRawForumFilters(data, foro): { banwords, banusers, highlightwords, highlightusers }
getActiveGroupFilters(data): { banwords, banusers, highlightwords, highlightusers }
getFeatureConfig(data): FcFeatureConfig
```

### Persistence (`persistence.ts`)

```ts
save_words(foro, form, words): Promise<void>
save_forum_batch(foro, fields): Promise<void>
saveGroup(groupId, group | null): Promise<void>
toggleGroup(groupId): Promise<FcGroup | null>
setGroupDuration(groupId, duration): Promise<void>
setGroupVisible(groupId, visible): Promise<FcGroup | null>
reorderGroups(orderedGids): Promise<void>
saveUser(username, entry | null): Promise<void>
saveFeatureConfig(patch): Promise<void>
saveForumConfig(foroId, patch): Promise<void>
saveGlobalList(key, value): Promise<void>
disableSessionAndExpiredGroups(data): Promise<boolean>
deactivateExpiredGroup(groupId): Promise<boolean>
checkStorageQuota(): Promise<{ used, total, percentUsed }>
```

### Utilidades (`utils.ts`, `groupUtils.ts`)

```ts
GetURLParameter(url, param): string | undefined
escapeRegExp(text): string
getRemainingLabel(group): string | null
```

---

## 7. Background service worker

`entrypoints/background.ts` gestiona tres responsabilidades:

### 7.1 Bootstrap y migración

Al arrancar (y en `onInstalled`), llama a `bootstrapLocal()`:

```ts
await Promise.all([getOrCreateDeviceId(), initPackedHash()]);
const data = await readLocalData();
await disableSessionAndExpiredGroups(data);
await syncAllGroupAlarms(data);
await packToSync(data);
```

### 7.2 Sincronización cross-device

```ts
browser.storage.sync.onChanged.addListener(async (changes) => {
  if (!changes[SYNC_META_KEY]) return;
  const meta = changes[SYNC_META_KEY].newValue;
  if (meta.deviceId === myDeviceId) return;
  const synced = await unpackFromSync();
  if (synced) {
    const validated = validateSyncData(synced);
    if (validated) await writeLocalData(validated);
  }
});
```

### 7.3 SCHEDULE_SYNC (debounce via alarms)

Los componentes UI envían `{ type: 'SCHEDULE_SYNC' }` tras cada escritura. El background debounce via alarma y ejecuta `packToSync`.

---

## 8. Componentes UI

### `components/PopupForm.vue`

Formulario reutilizable del popup. Recibe `foro` y `type` (`'banwords'` | `'banusers'`). Usa `readLocalData()` para cargar y `save_words()` para guardar.

### `entrypoints/popup/App.vue`

- En `onMounted`: detecta el foro activo vía `GET_THREAD_INFO` o URL parsing.
- Sección "Modos rápidos": toggle por grupo con `toggleGroup()` + envía `RERUN_FILTERS`.
- Acciones OP (en showthread): ban, VIP, notas.

### `entrypoints/options/components/ForumCards.vue`

Componente compartido que muestra tarjetas por foro con listas de palabras/usuarios. Prop `mode: 'hide' | 'highlight'` determina qué campos muestra (w/u vs hw/hu).

### `entrypoints/options/components/Groups.vue`

Gestión de modos rápidos. Prop `mode: 'hide' | 'highlight'`. Vista lista + modal de edición. Soporta drag-and-drop para reordenar.

### Páginas de opciones

| Ruta | Página | Fichero |
|------|--------|---------|
| `/` | Dashboard | `Dashboard.vue` |
| `/ocultar` | Ocultar | `Forum.vue` — toggle + ForumCards + Groups + protectVIP |
| `/resaltar` | Resaltar | `Resaltar.vue` — ForumCards + Groups + colores VIP/poles |
| `/posts` | Posts | `Threads.vue` — ignore users, highlight OP |
| `/usuarios` | Usuarios | `Usuarios.vue` — VIP + notas per-user |
| `/settings` | Ajustes | `Settings.vue` — export/import/reset |
| `/about` | Acerca de | `About.vue` |

---

## 9. Detección de tema

`components/utils/forumStyle.ts` exporta `getForumStyle(): 'old' | 'new'`.

- **Tema nuevo**: el elemento `#fc-desktop-version-tag-for-monitoring` existe en el DOM.
- **Tema viejo**: fallback.

La función debe llamarse **dentro de `main()`** del content script (cuando el DOM ya está disponible), no a nivel de módulo.

---

## 10. Ocultación de hilos

### Tema viejo (`oldTheme/`)

- `injectPostListElements.ts`: inyecta el `<tbody>` de hilos ocultos y el botón de colapso.
- `hideThreads.ts`: itera filas de la tabla, comprueba título y autor con `RegExp.test()`, oculta las que coincidan.

### Tema nuevo (`newTheme/`)

- `injectPostListElements.ts`: inyecta el menú de sección y el `<div>` de hilos ocultos.
- `hideThreads.ts`: itera las tarjetas de hilo, comprueba título y autor, mueve las coincidentes al contenedor `#hilos_ocultos`.

### Expresiones regulares

Las palabras se guardan en texto plano. Al leerlas en `content.ts`, se aplica `escapeRegExp()` antes de construir la regex, y se fusionan los arrays de foro y de grupos activos.

---

## 11. Funcionalidades en posts

El content script `posts.content.ts` delega a módulos en `components/posts/`:

### Post features (`postFeatures.ts`)

Para cada contenedor de post:
1. **Ignorar usuarios**: colapsa en spoiler o oculta completamente posts de banusers
2. **Resaltar OP**: colorea posts del creador del hilo
3. **Resaltar VIP**: colorea posts de usuarios con `highlightPost: true` (color per-user)
4. **Notas**: inyecta la nota junto al nombre del autor

### Video embed (`videoEmbed.ts`)

Busca enlaces a `.webm`, `.mp4`, `.ogg` en el cuerpo de los posts y los reemplaza con reproductores `<video>`.

### Reading progress (`readingProgress.ts`)

Sistema desactivado que trackea el progreso de lectura en hilos largos. Usa `IntersectionObserver` para detectar el último post visible y guarda la posición en `storage.local`.

---

## 12. Modos rápidos (grupos de filtros)

Los modos rápidos son conjuntos de palabras/usuarios globales que el usuario puede activar o desactivar desde el popup sin recargar la página. Son **aditivos** con los filtros por subforo.

Soportan dos tipos:
- `'hide'` (default): sus palabras (`w`/`u`) se suman a los filtros de ocultación
- `'highlight'`: sus palabras (`hw`/`hu`) se suman a los filtros de resaltado

### Duración configurable

- `'manual'` (default): permanece activo hasta toggle manual
- `'session'`: se desactiva automáticamente al reiniciar el navegador
- número de horas: se desactiva via alarma del browser (`groupAlarms.ts`)

### Mensaje `RERUN_FILTERS`

El popup envía este mensaje al content script de la pestaña activa tras cada toggle de grupo:

```ts
browser.tabs.sendMessage(tabId, { type: 'RERUN_FILTERS' });
```

---

## 13. Flujo de datos end-to-end

### Añadir una palabra desde el popup

```
Usuario escribe "trump" en PopupForm
  → save_words("2", "banwords", merged)
    → lee solo fc_f_2 de storage.local   (O(1))
    → escribe fc_f_2 actualizado
    → sendMessage(SCHEDULE_SYNC)
      → background debounce → packToSync(data)
```

### Activar un modo rápido desde el popup

```
Usuario activa toggle "Fútbol"
  → toggleGroup("uuid-abc")
    → lee fc_g_{uuid} → flip on → escribe
    → sendMessage(SCHEDULE_SYNC)
  → browser.tabs.sendMessage(tabId, RERUN_FILTERS)
    → content script: readLocalData → getFilters + getActiveGroupFilters → hide
```

### Otro dispositivo recibe la actualización

```
storage.sync.onChanged (fc_sync_meta)
  → meta.deviceId !== myDeviceId
  → unpackFromSync() → validateSyncData()
  → writeLocalData(data)
```

---

## 14. Convenciones de código

- **Nombres de función**: `snake_case` (ej: `save_words`, `save_forum_batch`)
- **Variables**: `camelCase`
- **Alias de ruta**: `@/` apunta a la raíz del proyecto (configurable en `tsconfig.json`)
- **Browser API**: importar `browser` desde `wxt/browser`, nunca desde `wxt/browser/chrome`
- **Storage**: nunca llamar `browser.storage.sync.*` directamente desde UI; siempre usar las funciones de `storageUtils`
- **Imports**: todos los consumers importan desde `@/components/hideThreads/storageUtils` (barrel); los módulos internos importan directamente entre sí para evitar ciclos
- **Idioma**: español en comentarios, variables de dominio y strings de UI
- **Sin jQuery**: los content scripts usan DOM vanilla

---

## 15. Añadir un nuevo foro

1. **Registrar el foro** en el objeto `foros` de `components/hideThreads/types.ts`:
   ```ts
   "999": ["Nombre del subforo"],
   // O con foro padre:
   "998": ["Nombre del subforo", 999],
   ```

2. **No hace falta nada más**: la lógica de storage, popup y opciones funciona para cualquier ID de foro.
