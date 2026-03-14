<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FwbButton, useToast } from 'flowbite-vue'
import { browser } from 'wxt/browser'
import {
  readLocalData, writeLocalData, saveGlobalList, checkSyncStorageQuota, validateFcData,
  META_KEY, FORUM_KEY_PREFIX, GROUP_KEY_PREFIX, HASH_KEY,
  USERS_KEY, IGNORED_KEY, DEVICE_ID_KEY, LAST_SYNC_KEY,
  SYNC_META_KEY, SYNC_CHUNK_PREFIX, SYNC_MAX_CHUNKS,
  foros
} from '@/components/hideThreads/storageUtils'
import { detectVersion, runMigrations } from '@/components/hideThreads/migrations'
import { useRefreshOnVisible } from '@/components/composables/useRefreshOnVisible'

const READING_PROGRESS_KEY = 'fc_reading_progress'
const SCROLL_TO_KEY = 'fc_scroll_to'

interface ReadingProgressEntry {
  page: number
  postIndex: number
  postId: string
  totalPosts: number
  postsPerPage: number
  timestamp: number
  title?: string
}

const toast = useToast()
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Sync info
const syncQuota = ref<{ used: number; total: number; percentUsed: number }>({ used: 0, total: 102_400, percentUsed: 0 })
const lastSyncDate = ref<number | undefined>(undefined)
const forcingSyncNow = ref(false)

// Modales
const showClearLocalModal = ref(false)
const showClearSyncModal = ref(false)
const showResetModal = ref(false)

// Usuarios ignorados
const ignoredUsers = ref<string[]>([])
const syncing = ref(false)

// Progreso de lectura
const readingProgress = ref<{ threadId: string; entry: ReadingProgressEntry }[]>([])

useRefreshOnVisible(async () => {
  const data = await readLocalData()
  ignoredUsers.value = data.ignored ?? []
  await loadSyncInfo()
  await loadReadingProgress()
})

async function loadSyncInfo() {
  syncQuota.value = await checkSyncStorageQuota()
  const result = await browser.storage.local.get(LAST_SYNC_KEY)
  lastSyncDate.value = result[LAST_SYNC_KEY] as number | undefined
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Nunca'
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Hace unos segundos'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  return `Hace ${days} día${days !== 1 ? 's' : ''}`
}

async function forceSyncNow() {
  forcingSyncNow.value = true
  try {
    const response = await browser.runtime.sendMessage({ type: 'FORCE_SYNC' })
    if (response?.ok) {
      toast.add({ type: 'success', time: 3000, text: 'Sincronización completada' })
    } else {
      toast.add({ type: 'danger', time: 5000, text: response?.error ?? 'Error al sincronizar' })
    }
    await loadSyncInfo()
  } catch {
    toast.add({ type: 'danger', time: 5000, text: 'Error al comunicar con el background' })
  } finally {
    forcingSyncNow.value = false
  }
}

// ─── Progreso de lectura ─────────────────────────────────────────────────────

async function loadReadingProgress() {
  const result = await browser.storage.local.get(READING_PROGRESS_KEY)
  const progress = (result[READING_PROGRESS_KEY] as Record<string, ReadingProgressEntry>) ?? {}
  readingProgress.value = Object.entries(progress)
    .map(([threadId, entry]) => ({ threadId, entry }))
    .sort((a, b) => b.entry.timestamp - a.entry.timestamp)
}

function formatProgressDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Hace menos de 1 hora'
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getProgressPercent(entry: ReadingProgressEntry): number {
  const absolutePost = (entry.page - 1) * entry.postsPerPage + entry.postIndex + 1
  return Math.min(100, Math.round((absolutePost / entry.totalPosts) * 100))
}

function goToProgress(threadId: string, entry: ReadingProgressEntry) {
  browser.storage.local.set({ [SCROLL_TO_KEY]: entry.postId }).then(() => {
    window.open(`https://forocoches.com/foro/showthread.php?t=${threadId}&page=${entry.page}`, '_blank')
  })
}

async function deleteProgress(threadId: string) {
  const result = await browser.storage.local.get(READING_PROGRESS_KEY)
  const progress = (result[READING_PROGRESS_KEY] as Record<string, ReadingProgressEntry>) ?? {}
  delete progress[threadId]
  await browser.storage.local.set({ [READING_PROGRESS_KEY]: progress })
  await loadReadingProgress()
  toast.add({ type: 'success', time: 2000, text: 'Progreso eliminado' })
}

async function clearAllProgress() {
  await browser.storage.local.remove(READING_PROGRESS_KEY)
  readingProgress.value = []
  toast.add({ type: 'success', time: 2000, text: 'Todo el progreso de lectura eliminado' })
}

// ─── Exportar / Importar ────────────────────────────────────────────────────

async function exportConfig() {
  const data = await readLocalData()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fc-hide-config.json'
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ type: 'success', time: 3000, text: 'Configuración exportada correctamente' })
}

function triggerImport() {
  fileInput.value?.click()
}

async function importConfig(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('invalid format')
    }
    const version = detectVersion(parsed)
    if (version === null) throw new Error('formato no reconocido')
    const data = runMigrations(parsed, version)
    if (!data) throw new Error('migración fallida')
    const validationErrors = validateFcData(data)
    if (validationErrors.length > 0) {
      console.warn('Import validation errors:', validationErrors)
      throw new Error('datos inválidos tras migración')
    }
    await writeLocalData(data)
    browser.runtime.sendMessage({ type: 'SCHEDULE_SYNC' }).catch(() => {})
    toast.add({ type: 'success', time: 3000, text: 'Configuración importada correctamente' })
  } catch {
    toast.add({ type: 'danger', time: 5000, text: 'Error al importar: el archivo no es válido' })
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ─── Borrar datos ───────────────────────────────────────────────────────────

// Nota: clearLocalData NO escribe un FcData vacío a propósito. Esto permite que
// readLocalData() caiga al fallback de unpackFromSync() y restaure los datos
// desde la nube (sync como backup). Si se quiere un borrado definitivo, usar "Resetear todo".
async function clearLocalData() {
  const metaResult = await browser.storage.local.get(META_KEY)
  const meta = metaResult[META_KEY] as any
  const forumKeys = (meta?.fids ?? Object.keys(foros)).map((id: string) => `${FORUM_KEY_PREFIX}${id}`)
  const groupKeys = (meta?.gids ?? []).map((id: string) => `${GROUP_KEY_PREFIX}${id}`)
  // No borrar DEVICE_ID_KEY ni LAST_SYNC_KEY (metadata de sync)
  await browser.storage.local.remove([META_KEY, HASH_KEY, USERS_KEY, IGNORED_KEY, ...forumKeys, ...groupKeys])
  showClearLocalModal.value = false
  await loadSyncInfo()
  toast.add({ type: 'success', time: 3000, text: 'Datos locales eliminados' })
}

async function clearSyncData() {
  const syncChunkKeys = Array.from({ length: SYNC_MAX_CHUNKS }, (_, i) => `${SYNC_CHUNK_PREFIX}${i}`)
  await browser.storage.sync.remove([SYNC_META_KEY, ...syncChunkKeys])
  showClearSyncModal.value = false
  await loadSyncInfo()
  toast.add({ type: 'success', time: 3000, text: 'Datos sincronizados eliminados' })
}

async function resetAll() {
  const syncChunkKeys = Array.from({ length: SYNC_MAX_CHUNKS }, (_, i) => `${SYNC_CHUNK_PREFIX}${i}`)
  const metaResult = await browser.storage.local.get(META_KEY)
  const meta = metaResult[META_KEY] as any
  const forumKeys = (meta?.fids ?? Object.keys(foros)).map((id: string) => `${FORUM_KEY_PREFIX}${id}`)
  const groupKeys = (meta?.gids ?? []).map((id: string) => `${GROUP_KEY_PREFIX}${id}`)
  await Promise.all([
    browser.storage.local.remove([META_KEY, HASH_KEY, USERS_KEY, IGNORED_KEY, LAST_SYNC_KEY, ...forumKeys, ...groupKeys]),
    browser.storage.sync.remove([SYNC_META_KEY, ...syncChunkKeys]),
  ])
  showResetModal.value = false
  await loadSyncInfo()
  ignoredUsers.value = []
  toast.add({ type: 'success', time: 3000, text: 'Toda la configuración eliminada' })
}

// ─── Usuarios ignorados ─────────────────────────────────────────────────────

async function syncIgnoredUsers() {
  syncing.value = true
  try {
    const response = await browser.runtime.sendMessage({ type: 'SYNC_IGNORELIST' })
    if (response?.ok) {
      ignoredUsers.value = response.users
      toast.add({ type: 'success', time: 3000, text: `${response.users.length} usuario(s) sincronizado(s)` })
    } else {
      toast.add({ type: 'danger', time: 5000, text: response?.error ?? 'Error al sincronizar' })
    }
  } catch {
    toast.add({ type: 'danger', time: 5000, text: 'Error al comunicar con el background' })
  } finally {
    syncing.value = false
  }
}

async function clearIgnoredUsers() {
  await saveGlobalList('ignored', [])
  ignoredUsers.value = []
  toast.add({ type: 'success', time: 2000, text: 'Lista de ignorados eliminada' })
}

</script>

<template>
  <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Ajustes</h1>

  <div class="space-y-4">
    <!-- Exportar / Importar — 2 columnas -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Exportar -->
      <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 flex flex-col">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Exportar configuración</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">
          Descarga un archivo JSON con todas tus palabras y usuarios filtrados.
        </p>
        <div>
          <fwb-button color="light" @click="exportConfig">
            <template #prefix>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </template>
            Exportar
          </fwb-button>
        </div>
      </div>

      <!-- Importar -->
      <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 flex flex-col">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Importar configuración</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">
          Carga un archivo JSON exportado previamente. Esto reemplazará los datos actuales.
        </p>
        <div>
          <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="importConfig" />
          <fwb-button color="light" @click="triggerImport" :disabled="importing">
            <template #prefix>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </template>
            {{ importing ? 'Importando...' : 'Importar' }}
          </fwb-button>
        </div>
      </div>
    </div>

    <!-- Sincronización -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Sincronización entre dispositivos</h2>

      <!-- Barra de uso -->
      <div class="mb-3">
        <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
          <span>Uso de storage.sync</span>
          <span>{{ syncQuota.percentUsed }}% ({{ formatBytes(syncQuota.used) }} / {{ formatBytes(syncQuota.total) }})</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div
            class="h-2.5 rounded-full transition-all duration-300"
            :class="syncQuota.percentUsed > 90 ? 'bg-red-500' : syncQuota.percentUsed > 70 ? 'bg-yellow-400' : 'bg-blue-500'"
            :style="{ width: `${Math.min(syncQuota.percentUsed, 100)}%` }"
          ></div>
        </div>
      </div>

      <!-- Última sincronización -->
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Última sincronización: <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatRelativeTime(lastSyncDate) }}</span>
      </p>

      <!-- Botón sincronizar -->
      <fwb-button size="sm" @click="forceSyncNow" :disabled="forcingSyncNow">
        <template #prefix>
          <svg v-if="forcingSyncNow" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </template>
        {{ forcingSyncNow ? 'Sincronizando...' : 'Sincronizar ahora' }}
      </fwb-button>
    </div>

    <!-- Progreso de lectura (desactivado temporalmente) -->
    <div v-if="false" class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Progreso de lectura</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Hilos con progreso guardado. Haz clic en "Ir" para continuar leyendo.
          </p>
        </div>
        <button
          v-if="readingProgress.length > 0"
          class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          @click="clearAllProgress"
        >
          Borrar todo
        </button>
      </div>

      <div v-if="readingProgress.length === 0" class="text-sm text-gray-400 dark:text-gray-500 text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
        No hay progreso de lectura guardado
      </div>

      <div v-else class="space-y-3 max-h-96 overflow-y-auto">
        <div
          v-for="{ threadId, entry } in readingProgress"
          :key="threadId"
          class="p-3 border border-gray-100 dark:border-gray-600 rounded-lg"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate" :title="entry.title ?? `Hilo #${threadId}`">
                {{ entry.title ?? `Hilo #${threadId}` }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Post {{ ((entry.page - 1) * entry.postsPerPage + entry.postIndex + 1).toLocaleString('es-ES') }}
                de {{ entry.totalPosts.toLocaleString('es-ES') }}
                — Pag. {{ entry.page }} de {{ Math.ceil(entry.totalPosts / entry.postsPerPage).toLocaleString('es-ES') }}
                — {{ formatProgressDate(entry.timestamp) }}
              </p>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                class="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                @click="goToProgress(threadId, entry)"
                title="Ir a la ultima posicion leida"
              >
                Ir
              </button>
              <button
                class="p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                @click="deleteProgress(threadId)"
                title="Eliminar progreso"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div
              class="bg-blue-500 h-1.5 rounded-full transition-all"
              :style="{ width: getProgressPercent(entry) + '%' }"
            ></div>
          </div>
          <p class="text-right text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{{ getProgressPercent(entry) }}%</p>
        </div>
      </div>
    </div>

    <!-- Borrar datos — 3 botones -->
    <div class="p-5 bg-white border border-red-200 rounded-lg dark:bg-gray-800 dark:border-red-900/50">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-1">Zona de peligro</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Estas acciones son irreversibles. Exporta tus datos antes de borrar.
      </p>
      <div class="flex flex-wrap gap-3">
        <button
          class="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 dark:text-red-500 dark:border-red-500 dark:hover:bg-red-950"
          @click="showClearLocalModal = true"
        >
          Borrar local
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 dark:text-red-500 dark:border-red-500 dark:hover:bg-red-950"
          @click="showClearSyncModal = true"
        >
          Borrar sync
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          @click="showResetModal = true"
        >
          Resetear todo
        </button>
      </div>
    </div>

    <!-- Usuarios ignorados (sincronización desde FC) -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">Usuarios ignorados de Forocoches</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-4">
        Importa tu lista de ignorados de Forocoches. Los hilos de estos usuarios se ocultarán automáticamente en todos los subforos.
        Necesitas estar logueado en Forocoches.
      </p>
      <div class="flex gap-2 mb-4">
        <fwb-button size="sm" @click="syncIgnoredUsers" :disabled="syncing">
          <template #prefix>
            <svg v-if="syncing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </template>
          {{ syncing ? 'Sincronizando...' : 'Sincronizar ahora' }}
        </fwb-button>
        <fwb-button v-if="ignoredUsers.length > 0" size="sm" color="red" @click="clearIgnoredUsers">
          Limpiar
        </fwb-button>
      </div>

      <div v-if="ignoredUsers.length === 0" class="text-sm text-gray-400 dark:text-gray-500 text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
        No hay usuarios ignorados sincronizados
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <span v-for="user in ignoredUsers" :key="user"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {{ user }}
        </span>
      </div>
    </div>

  </div>

  <!-- Modal: Borrar datos locales -->
  <div v-if="showClearLocalModal" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-gray-900/50" @click="showClearLocalModal = false"></div>
    <div class="relative z-10 w-full max-w-md p-6 bg-white rounded-lg shadow dark:bg-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">¿Borrar datos locales?</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Se eliminarán todas las palabras filtradas, usuarios, modos rápidos y ajustes de este dispositivo.
        Los datos sincronizados en la nube no se verán afectados.
      </p>
      <div class="flex gap-3 justify-end">
        <fwb-button color="light" @click="showClearLocalModal = false">Cancelar</fwb-button>
        <fwb-button color="red" @click="clearLocalData">Sí, borrar local</fwb-button>
      </div>
    </div>
  </div>

  <!-- Modal: Borrar datos sincronizados -->
  <div v-if="showClearSyncModal" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-gray-900/50" @click="showClearSyncModal = false"></div>
    <div class="relative z-10 w-full max-w-md p-6 bg-white rounded-lg shadow dark:bg-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">¿Borrar datos sincronizados?</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Se eliminarán los datos almacenados en storage.sync (la nube del navegador).
        Los datos locales de este dispositivo no se verán afectados.
      </p>
      <div class="flex gap-3 justify-end">
        <fwb-button color="light" @click="showClearSyncModal = false">Cancelar</fwb-button>
        <fwb-button color="red" @click="clearSyncData">Sí, borrar sync</fwb-button>
      </div>
    </div>
  </div>

  <!-- Modal: Resetear todo -->
  <div v-if="showResetModal" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-gray-900/50" @click="showResetModal = false"></div>
    <div class="relative z-10 w-full max-w-md p-6 bg-white rounded-lg shadow dark:bg-gray-700">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">¿Resetear toda la configuración?</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Se eliminarán todas las palabras filtradas, usuarios bloqueados, modos rápidos y ajustes de todos los foros,
        tanto localmente como en la nube. Esta acción es irreversible.
      </p>
      <div class="flex gap-3 justify-end">
        <fwb-button color="light" @click="showResetModal = false">Cancelar</fwb-button>
        <fwb-button color="red" @click="resetAll">Sí, resetear todo</fwb-button>
      </div>
    </div>
  </div>
</template>
