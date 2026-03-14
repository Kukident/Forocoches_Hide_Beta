<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { browser } from 'wxt/browser';
import PopupForm from '@/components/PopupForm.vue';
import {
  foros, GetURLParameter, readLocalData, toggleGroup, setGroupDuration,
  isGroupExpired, getRawForumFilters, save_words,
  saveUser, saveFeatureConfig, getFeatureConfig,
  DEFAULT_FEATURE_CONFIG, getRemainingLabel,
  type FcGroup, type GroupDuration, type FcFeatureConfig,
} from '@/components/hideThreads/storageUtils';

type PageType = 'forum' | 'thread' | 'other';

const pageType = ref<PageType>('other');
const foro = ref<string | undefined>(undefined);
const foroName = ref<string>('');
const activeTab = ref<'banwords' | 'banusers'>('banwords');
const scope = ref<'forum' | 'global'>('forum');
const groups = ref<{ id: string; group: FcGroup }[]>([]);
const visibleGroups = computed(() => groups.value.filter(e => e.group.visible !== false));
const forocochesTabId = ref<number | undefined>(undefined);

// Estado para contexto hilo
const threadInfo = ref<{
  forumId: string | null;
  forumName: string | null;
  opUsername: string | null;
  threadTitle: string | null;
} | null>(null);

const features = ref<FcFeatureConfig>({ ...DEFAULT_FEATURE_CONFIG });
const noteInput = ref('');
const opBanned = ref(false);
const opIsVip = ref(false);
const opHasNote = ref(false);
const savingOp = ref(false);
const readingProgress = ref<{
  currentPost: number;
  totalPosts: number;
  page: number;
  totalPages: number;
  savedEntry?: { page: number; postIndex: number; postId: string; totalPosts: number; postsPerPage: number; timestamp: number } | null;
} | null>(null);

onMounted(async () => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });
  const tab = tabs[0];
  const url = tab?.url;

  if (url?.includes('forocoches.com')) {
    forocochesTabId.value = tab?.id;

    if (url.includes('forumdisplay.php') && GetURLParameter(url, 'f')) {
      // Listado de hilos
      pageType.value = 'forum';
      const f = GetURLParameter(url, 'f')!;
      foro.value = f;
      foroName.value = foros[f] ? (foros[f][0] as string) : `Subforo ${f}`;
    } else if (url.includes('showthread.php')) {
      // Hilo concreto
      pageType.value = 'thread';
      try {
        threadInfo.value = await browser.tabs.sendMessage(tab!.id!, { type: 'GET_THREAD_INFO' });
        if (threadInfo.value?.forumId) {
          foro.value = threadInfo.value.forumId;
          foroName.value = threadInfo.value.forumName
            ?? (foros[threadInfo.value.forumId] ? (foros[threadInfo.value.forumId][0] as string) : '')
            ?? `Subforo ${threadInfo.value.forumId}`;
        }
      } catch { threadInfo.value = null; }
    }
  }

  const data = await readLocalData();
  groups.value = Object.entries(data.g ?? {}).map(([id, group]) => ({ id, group: { ...group } }));

  // Fallback: desactivar grupos expirados que la alarm del background no haya procesado aún
  for (const entry of groups.value) {
    if (isGroupExpired(entry.group)) {
      const updated = await toggleGroup(entry.id);
      if (updated) entry.group = updated;
    }
  }

  // Estado del OP y features para contexto hilo
  if (pageType.value === 'thread') {
    features.value = getFeatureConfig(data);
    if (threadInfo.value?.opUsername) {
      const op = threadInfo.value.opUsername.toLowerCase();
      const globalBanusers = getRawForumFilters(data, '*').banusers.map(u => u.toLowerCase());
      opBanned.value = globalBanusers.includes(op);
      const userEntry = (data.users ?? {})[op];
      opIsVip.value = !!(userEntry?.highlightThread || userEntry?.highlightPost);
      noteInput.value = userEntry?.note ?? '';
      opHasNote.value = !!userEntry?.note;
    }
    // Fetch reading progress
    if (features.value.readingProgress && forocochesTabId.value !== undefined) {
      try {
        readingProgress.value = await browser.tabs.sendMessage(forocochesTabId.value, { type: 'GET_READING_PROGRESS' });
      } catch { readingProgress.value = null; }
    }
  }
});

const openSettingsPage = (hash?: string) => {
  browser.tabs.create({ url: browser.runtime.getURL('/options.html') + (hash ?? '') });
};

function sendRerunFilters() {
  if (forocochesTabId.value !== undefined) {
    browser.tabs.sendMessage(forocochesTabId.value, { type: 'RERUN_FILTERS' }).catch(() => {});
  }
}

// -- Acciones sobre el OP

async function addOpToBanusers() {
  if (!threadInfo.value?.opUsername || opBanned.value || savingOp.value) return;
  savingOp.value = true;
  try {
    const op = threadInfo.value.opUsername;
    const data = await readLocalData();
    const existing = getRawForumFilters(data, '*').banusers;
    if (!existing.some(u => u.toLowerCase() === op.toLowerCase())) {
      await save_words('*', 'banusers', [...existing, op]);
      opBanned.value = true;
    }
    sendRerunFilters();
  } finally {
    savingOp.value = false;
  }
}

async function addOpToVip() {
  if (!threadInfo.value?.opUsername || opIsVip.value || savingOp.value) return;
  savingOp.value = true;
  try {
    const op = threadInfo.value.opUsername.toLowerCase();
    const data = await readLocalData();
    const existing = (data.users ?? {})[op] ?? {};
    await saveUser(op, { ...existing, highlightThread: true, highlightPost: true });
    opIsVip.value = true;
    sendRerunFilters();
  } finally {
    savingOp.value = false;
  }
}

async function saveOpNote() {
  if (!threadInfo.value?.opUsername || savingOp.value) return;
  savingOp.value = true;
  try {
    const op = threadInfo.value.opUsername.toLowerCase();
    const data = await readLocalData();
    const existing = (data.users ?? {})[op] ?? {};
    const trimmed = noteInput.value.trim();
    await saveUser(op, { ...existing, note: trimmed || undefined });
    opHasNote.value = !!trimmed;
    sendRerunFilters();
  } finally {
    savingOp.value = false;
  }
}

async function goToLastPosition() {
  if (!readingProgress.value?.savedEntry || forocochesTabId.value === undefined) return;
  const entry = readingProgress.value.savedEntry;
  try {
    const response = await browser.tabs.sendMessage(forocochesTabId.value, {
      type: 'SCROLL_TO_POST',
      postId: entry.postId,
      page: entry.page,
    });
    if (response?.redirect && response.url) {
      // Set scroll-to flag before navigating
      await browser.storage.local.set({ fc_scroll_to: entry.postId });
      await browser.tabs.update(forocochesTabId.value, { url: response.url });
      window.close();
    }
  } catch { /* content script not available */ }
}

async function toggleFeature(key: keyof FcFeatureConfig) {
  const val = features.value[key];
  if (typeof val === 'boolean') {
    (features.value as any)[key] = !val;
    await saveFeatureConfig({ [key]: !val });
    sendRerunFilters();
  }
}

// -- Modos rápidos (sin cambios)

const durationOptions: { label: string; value: GroupDuration; description: string }[] = [
  { label: '∞', value: 'manual', description: 'Sin expiración' },
  { label: '1h', value: 1, description: '1 hora' },
  { label: '2h', value: 2, description: '2 horas' },
  { label: '4h', value: 4, description: '4 horas' },
  { label: '8h', value: 8, description: '8 horas' },
  { label: '↺', value: 'session', description: 'Hasta reinicio' },
];

const openDurationDropdown = ref<string | null>(null);

function isDurationSelected(group: FcGroup, val: GroupDuration): boolean {
  if (val === 'manual') return !group.duration || group.duration === 'manual';
  return group.duration === val;
}

function getCurrentDurationLabel(group: FcGroup): string {
  const dur = group.duration ?? 'manual';
  return durationOptions.find(o => o.value === dur)?.label ?? '∞';
}

function toggleDurationDropdown(id: string) {
  openDurationDropdown.value = openDurationDropdown.value === id ? null : id;
}

const handleGroupToggle = async (id: string) => {
  const updated = await toggleGroup(id);
  const entry = groups.value.find(g => g.id === id);
  if (entry && updated) {
    entry.group = updated;
  }
  sendRerunFilters();
};

const handleDurationSelect = async (id: string, group: FcGroup, duration: GroupDuration) => {
  await setGroupDuration(id, duration);
  if (duration === 'manual') {
    delete group.duration;
    delete group.activatedAt;
  } else {
    group.duration = duration;
    group.activatedAt = Date.now();
  }
  openDurationDropdown.value = null;
};

</script>

<template>
  <div class="w-80 bg-white dark:bg-gray-800 flex flex-col" @click="openDurationDropdown = null">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <img src="/icon/128.png" class="w-5 h-5" alt="Forocoches+" />
        <span class="font-semibold text-gray-900 dark:text-white text-sm">Forocoches+</span>
      </div>
    </div>

    <!-- Modos rápidos (visible si hay grupos creados) -->
    <div v-if="pageType === 'forum' && visibleGroups.length > 0" class="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Modos rápidos</span>
        <button
          @click="openSettingsPage('#/ocultar')"
          class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >Gestionar →</button>
      </div>
      <div class="flex flex-col gap-1 max-h-[13.5rem] overflow-y-auto">
        <div
          v-for="entry in visibleGroups"
          :key="entry.id"
          class="flex items-center justify-between py-0.5"
        >
          <div class="flex-1 min-w-0 mr-2">
            <span class="text-sm text-gray-700 dark:text-gray-300 truncate block">{{ entry.group.name }}</span>
            <!-- Chip de duración + dropdown: visible solo cuando el grupo está activo -->
            <div v-if="entry.group.on" class="flex items-center gap-1 mt-1 relative">
              <button
                @click.stop="toggleDurationDropdown(entry.id)"
                class="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full transition-colors leading-tight bg-blue-600 text-white hover:bg-blue-700"
              >{{ getCurrentDurationLabel(entry.group) }} <span class="text-[10px]">▾</span></button>
              <span v-if="getRemainingLabel(entry.group)" class="text-xs text-gray-400 dark:text-gray-500">{{ getRemainingLabel(entry.group) }}</span>
              <!-- Dropdown -->
              <div
                v-if="openDurationDropdown === entry.id"
                @click.stop
                class="absolute left-0 top-full z-10 mt-1 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1"
              >
                <button
                  v-for="opt in durationOptions"
                  :key="String(opt.value)"
                  @click.stop="handleDurationSelect(entry.id, entry.group, opt.value)"
                  class="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  :class="isDurationSelected(entry.group, opt.value) ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'"
                >
                  <span>{{ opt.label }} <span class="ml-1 text-gray-400 dark:text-gray-500 font-normal">{{ opt.description }}</span></span>
                  <svg v-if="isDurationSelected(entry.group, opt.value)" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <button
            @click="handleGroupToggle(entry.id)"
            :class="entry.group.on ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
            class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
          >
            <span
              :class="entry.group.on ? 'translate-x-5' : 'translate-x-1'"
              class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Contexto: listado de hilos (forumdisplay) -->
    <div v-if="pageType === 'forum'" class="flex flex-col flex-1">
      <!-- Scope toggle -->
      <div class="px-4 pt-3 pb-1 flex gap-1">
        <button
          @click="scope = 'forum'"
          :class="scope === 'forum'
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700'
            : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
          class="flex-1 text-xs font-medium px-2 py-1 rounded border transition-colors"
        >Este foro</button>
        <button
          @click="scope = 'global'"
          :class="scope === 'global'
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700'
            : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
          class="flex-1 text-xs font-medium px-2 py-1 rounded border transition-colors"
        >Todos los foros</button>
      </div>

      <!-- Badge con nombre del foro (solo en scope forum) -->
      <div v-if="scope === 'forum'" class="px-4 pt-1 pb-2">
        <span class="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          {{ foroName }}
        </span>
      </div>
      <div v-else class="px-4 pt-1 pb-2">
        <span class="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Filtros globales
        </span>
      </div>

      <!-- Tabs -->
      <div class="px-4 flex gap-1 mb-2">
        <button
          @click="activeTab = 'banwords'"
          :class="activeTab === 'banwords'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
          class="flex-1 text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          Palabras
        </button>
        <button
          @click="activeTab = 'banusers'"
          :class="activeTab === 'banusers'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
          class="flex-1 text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          Usuarios
        </button>
      </div>

      <!-- Formulario de filtros -->
      <div class="px-4 pb-3">
        <PopupForm :foro="scope === 'global' ? '*' : foro!" :type="activeTab" :key="`${scope}-${activeTab}`" />
      </div>
    </div>

    <!-- Contexto: hilo (showthread) -->
    <div v-else-if="pageType === 'thread'" class="flex flex-col flex-1">
      <!-- Título del hilo + subforo -->
      <div class="px-4 pt-3 pb-2">
        <p class="text-sm font-medium text-gray-900 dark:text-white leading-tight line-clamp-2">
          {{ threadInfo?.threadTitle ?? 'Hilo' }}
        </p>
        <span v-if="foroName" class="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          {{ foroName }}
        </span>
      </div>

      <!-- Acciones sobre el OP -->
      <div v-if="threadInfo?.opUsername" class="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acciones OP</span>
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{{ threadInfo.opUsername }}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <!-- Ocultar hilos del OP -->
          <button
            @click="addOpToBanusers"
            :disabled="opBanned || savingOp"
            :class="opBanned
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800'"
            class="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium transition-colors"
          >
            <svg v-if="!opBanned" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ opBanned ? 'Ya oculto' : 'Ocultar hilos' }}
          </button>
          <!-- Añadir a VIP -->
          <button
            @click="addOpToVip"
            :disabled="opIsVip || savingOp"
            :class="opIsVip
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border-amber-200 dark:border-amber-800'"
            class="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium transition-colors"
          >
            <svg v-if="!opIsVip" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ opIsVip ? 'Ya es VIP' : 'Añadir VIP' }}
          </button>
        </div>
        <!-- Nota del OP -->
        <div class="relative">
          <input
            v-model="noteInput"
            @keydown.enter="saveOpNote"
            @blur="saveOpNote"
            type="text"
            maxlength="256"
            placeholder="Escribir nota..."
            class="w-full text-xs px-3 py-1.5 pr-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </div>
      </div>

      <!-- Aviso si no estamos en página 1 -->
      <div v-else class="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <p class="text-xs text-gray-400 dark:text-gray-500 text-center">
          Acciones del OP solo disponibles en la primera página
        </p>
      </div>

      <!-- Progreso de lectura (desactivado temporalmente) -->
      <div v-if="false && readingProgress && features.readingProgress" class="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Progreso de lectura</span>
        <!-- Progress bar -->
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all"
            :style="{ width: Math.min(100, Math.round(readingProgress!.currentPost / readingProgress!.totalPosts * 100)) + '%' }"
          ></div>
        </div>
        <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
          Post {{ readingProgress!.currentPost.toLocaleString('es-ES') }} de {{ readingProgress!.totalPosts.toLocaleString('es-ES') }}
          <span v-if="readingProgress!.totalPages > 1"> — Pagina {{ readingProgress!.page }} de {{ readingProgress!.totalPages.toLocaleString('es-ES') }}</span>
        </p>
        <!-- Go to last position button -->
        <button
          v-if="readingProgress!.savedEntry && readingProgress!.savedEntry!.page !== readingProgress!.page"
          @click="goToLastPosition"
          class="w-full text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          Ir a ultima posicion (pag. {{ readingProgress!.savedEntry!.page }})
        </button>
      </div>

      <!-- Toggles de vista del hilo -->
      <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Vista del hilo</span>
        <div class="flex flex-col gap-2">
          <!-- Ignorar usuarios en posts -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-700 dark:text-gray-300">Ignorar usuarios en posts</span>
            <button
              @click="toggleFeature('ignoreUsersInPosts')"
              :class="features.ignoreUsersInPosts ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="features.ignoreUsersInPosts ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
          <!-- Resaltar OP -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-700 dark:text-gray-300">Resaltar OP</span>
            <button
              @click="toggleFeature('highlightOP')"
              :class="features.highlightOP ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="features.highlightOP ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
          <!-- Resaltar VIP: en showthread → highlightVIPPosts, en forumdisplay → highlightVIP -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-700 dark:text-gray-300">Resaltar VIP</span>
            <button
              @click="toggleFeature(threadInfo ? 'highlightVIPPosts' : 'highlightVIP')"
              :class="(threadInfo ? features.highlightVIPPosts : features.highlightVIP) ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="(threadInfo ? features.highlightVIPPosts : features.highlightVIP) ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
          <!-- Notas de usuario -->
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-700 dark:text-gray-300">Notas de usuario</span>
            <button
              @click="toggleFeature('userNotes')"
              :class="features.userNotes ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="features.userNotes ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
          <!-- Progreso de lectura (desactivado temporalmente) -->
          <div v-if="false" class="flex items-center justify-between">
            <span class="text-xs text-gray-700 dark:text-gray-300">Progreso de lectura</span>
            <button
              @click="toggleFeature('readingProgress')"
              :class="features.readingProgress ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="features.readingProgress ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Fuera de Forocoches -->
    <div v-else class="flex flex-col items-center justify-center py-8 px-4 text-center gap-3">
      <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Abre un subforo de Forocoches</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">para gestionar filtros</p>
      </div>
      <button
        @click="openSettingsPage()"
        class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 px-3 py-1.5 rounded transition-colors"
      >
        Ir a Ajustes
      </button>
    </div>

    <!-- Footer -->
    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <button
        @click="openSettingsPage(pageType === 'forum' ? '#/ocultar' : pageType === 'thread' ? '#/posts' : undefined)"
        class="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-right transition-colors"
      >
        Ajustes avanzados →
      </button>
    </div>
  </div>
</template>
