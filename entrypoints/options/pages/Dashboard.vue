<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { browser } from 'wxt/browser';
import {
  readLocalData, getFeatureConfig, getActiveGroupFilters,
  isGroupExpired, foros,
  type FcData, type FcFeatureConfig, type FcGroup,
} from '@/components/hideThreads/storageUtils';
import { useRefreshOnVisible } from '@/components/composables/useRefreshOnVisible';

const READING_PROGRESS_KEY = 'fc_reading_progress';
const SCROLL_TO_KEY = 'fc_scroll_to';

interface ReadingProgressEntry {
  page: number;
  postIndex: number;
  postId: string;
  totalPosts: number;
  postsPerPage: number;
  timestamp: number;
  title?: string;
}

const loaded = ref(false);

// Stats
const totalBanwords = ref(0);
const totalBanusers = ref(0);
const totalHighlightWords = ref(0);
const totalHighlightUsers = ref(0);
const forosConfigurados = ref(0);
const gruposTotal = ref(0);
const gruposActivos = ref(0);
const usuariosVIP = ref(0);
const usuariosConNotas = ref(0);
const featuresActivas = ref(0);
const featuresTotal = ref(0);
const foroMasProtegido = ref('');
const foroMasProtegidoCount = ref(0);

// Feature booleans for toggle display
const featureList = ref<{ name: string; active: boolean }[]>([]);

// Reading progress (top 3 most recent)
const recentProgress = ref<{ threadId: string; entry: ReadingProgressEntry }[]>([]);

function countForumWords(data: FcData) {
  let bw = 0, bu = 0, hw = 0, hu = 0;
  let maxForo = '', maxCount = 0;

  for (const [id, foro] of Object.entries(data.f)) {
    const w = foro.w?.length ?? 0;
    const u = foro.u?.length ?? 0;
    bw += w;
    bu += u;
    hw += foro.hw?.length ?? 0;
    hu += foro.hu?.length ?? 0;

    const total = w + u;
    if (total > maxCount && id !== '*') {
      maxCount = total;
      maxForo = (foros[id]?.[0] as string) ?? `Foro ${id}`;
    }
  }
  return { bw, bu, hw, hu, maxForo, maxCount };
}

function countGroups(data: FcData) {
  let total = 0, active = 0;
  if (data.g) {
    for (const g of Object.values(data.g) as FcGroup[]) {
      total++;
      if (g.on && !isGroupExpired(g)) active++;
    }
  }
  return { total, active };
}

function countUsers(data: FcData) {
  let vip = 0, notes = 0;
  if (data.users) {
    for (const entry of Object.values(data.users)) {
      if (entry.highlightThread || entry.highlightPost) vip++;
      if (entry.note) notes++;
    }
  }
  return { vip, notes };
}

function countFeatures(features: FcFeatureConfig) {
  const items: { name: string; key: keyof FcFeatureConfig }[] = [
    { name: 'Ocultar hilos', key: 'hideThreads' },
    { name: 'Resaltar hilos', key: 'highlightThreads' },
    { name: 'Indicador (ocultar)', key: 'filterIndicatorHide' },
    { name: 'Indicador (resaltar)', key: 'filterIndicatorHighlight' },
    { name: 'Ignorar usuarios en posts', key: 'ignoreUsersInPosts' },
    { name: 'Resaltar OP', key: 'highlightOP' },
    { name: 'Resaltar poles', key: 'highlightPoles' },
    { name: 'Notas de usuario', key: 'userNotes' },
    { name: 'Resaltar VIP', key: 'highlightVIP' },
    { name: 'Proteger VIP', key: 'protectVIP' },
  ];

  const list = items.map(i => ({ name: i.name, active: !!features[i.key] }));
  const active = list.filter(f => f.active).length;
  return { list, active, total: list.length };
}

function formatProgressTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Hace < 1h';
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

function getProgressPercent(entry: ReadingProgressEntry): number {
  const absolutePost = (entry.page - 1) * entry.postsPerPage + entry.postIndex + 1;
  return Math.min(100, Math.round((absolutePost / entry.totalPosts) * 100));
}

function goToProgress(threadId: string, entry: ReadingProgressEntry) {
  browser.storage.local.set({ [SCROLL_TO_KEY]: entry.postId }).then(() => {
    window.open(`https://forocoches.com/foro/showthread.php?t=${threadId}&page=${entry.page}`, '_blank');
  });
}

useRefreshOnVisible(async () => {
  const data = await readLocalData();
  const features = getFeatureConfig(data);

  const words = countForumWords(data);
  totalBanwords.value = words.bw;
  totalBanusers.value = words.bu;
  totalHighlightWords.value = words.hw;
  totalHighlightUsers.value = words.hu;
  foroMasProtegido.value = words.maxForo;
  foroMasProtegidoCount.value = words.maxCount;

  // Forums with at least one filter
  forosConfigurados.value = Object.keys(data.f).filter(id => {
    const f = data.f[id];
    return (f.w?.length ?? 0) + (f.u?.length ?? 0) + (f.hw?.length ?? 0) + (f.hu?.length ?? 0) > 0;
  }).length;

  const groups = countGroups(data);
  gruposTotal.value = groups.total;
  gruposActivos.value = groups.active;

  const users = countUsers(data);
  usuariosVIP.value = users.vip;
  usuariosConNotas.value = users.notes;

  const feat = countFeatures(features);
  featureList.value = feat.list;
  featuresActivas.value = feat.active;
  featuresTotal.value = feat.total;

  // Reading progress — top 3 most recent
  const rpResult = await browser.storage.local.get(READING_PROGRESS_KEY);
  const rpData = (rpResult[READING_PROGRESS_KEY] as Record<string, ReadingProgressEntry>) ?? {};
  recentProgress.value = Object.entries(rpData)
    .map(([threadId, entry]) => ({ threadId, entry }))
    .sort((a, b) => b.entry.timestamp - a.entry.timestamp)
    .slice(0, 3);

  loaded.value = true;
});
</script>

<template>
  <div v-if="!loaded" class="flex items-center justify-center py-12">
    <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  </div>

  <div v-else>
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Dashboard</h1>

    <!-- Stat cards grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- Palabras ocultas -->
      <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalBanwords }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Palabras ocultas</p>
          </div>
        </div>
      </div>

      <!-- Usuarios ocultos -->
      <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <svg class="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalBanusers }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Usuarios ocultos</p>
          </div>
        </div>
      </div>

      <!-- Palabras resaltadas -->
      <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalHighlightWords }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Palabras resaltadas</p>
          </div>
        </div>
      </div>

      <!-- Usuarios VIP -->
      <div class="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ usuariosVIP }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Usuarios VIP</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Second row: Details -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <!-- Resumen general -->
      <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Resumen</h2>
        <dl class="space-y-3">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Foros con filtros</dt>
            <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ forosConfigurados }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Grupos creados</dt>
            <dd class="text-sm font-medium text-gray-900 dark:text-white">
              {{ gruposTotal }}
              <span v-if="gruposActivos > 0" class="text-green-600 dark:text-green-400">({{ gruposActivos }} activos)</span>
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Usuarios con notas</dt>
            <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ usuariosConNotas }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Usuarios resaltados</dt>
            <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ totalHighlightUsers }}</dd>
          </div>
          <div v-if="foroMasProtegido" class="flex justify-between">
            <dt class="text-sm text-gray-500 dark:text-gray-400">Foro con mas filtros</dt>
            <dd class="text-sm font-medium text-gray-900 dark:text-white">
              {{ foroMasProtegido }}
              <span class="text-gray-400 dark:text-gray-500">({{ foroMasProtegidoCount }})</span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Features activas -->
      <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Funcionalidades
        </h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">{{ featuresActivas }} de {{ featuresTotal }} activas</p>
        <!-- Progress bar -->
        <div class="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 mb-4">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all"
            :style="{ width: (featuresActivas / featuresTotal * 100) + '%' }"
          />
        </div>
        <ul class="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <li v-for="f in featureList" :key="f.name" class="flex items-center gap-2 text-sm">
            <span
              :class="f.active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'"
              class="inline-block w-2 h-2 rounded-full flex-shrink-0"
            />
            <span :class="f.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'">
              {{ f.name }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Reading progress (compact) (desactivado temporalmente) -->
    <div v-if="false && recentProgress.length > 0" class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Continuar leyendo</h2>
        <RouterLink to="/settings" class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">Ver todo</RouterLink>
      </div>
      <div class="space-y-2">
        <div
          v-for="{ threadId, entry } in recentProgress"
          :key="threadId"
          class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
        >
          <!-- Progress ring -->
          <div class="relative flex-shrink-0 w-9 h-9">
            <svg class="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-width="3" class="text-gray-200 dark:text-gray-600" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" stroke-width="3"
                class="text-blue-500"
                :stroke-dasharray="`${getProgressPercent(entry) * 0.9425} 94.25`"
                stroke-linecap="round"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
              {{ getProgressPercent(entry) }}%
            </span>
          </div>
          <!-- Info -->
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate" :title="entry.title ?? `Hilo #${threadId}`">
              {{ entry.title ?? `Hilo #${threadId}` }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500">
              Pag. {{ entry.page }} — {{ formatProgressTime(entry.timestamp) }}
            </p>
          </div>
          <!-- Go button -->
          <button
            class="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            @click="goToProgress(threadId, entry)"
            title="Continuar leyendo"
          >
            Ir
          </button>
        </div>
      </div>
    </div>

    <!-- Quick links -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <RouterLink
        to="/ocultar"
        class="flex items-center gap-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
        </svg>
        Ocultar
      </RouterLink>
      <RouterLink
        to="/resaltar"
        class="flex items-center gap-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        Resaltar
      </RouterLink>
      <RouterLink
        to="/usuarios"
        class="flex items-center gap-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Usuarios VIP
      </RouterLink>
      <RouterLink
        to="/settings"
        class="flex items-center gap-2 p-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
        Ajustes
      </RouterLink>
    </div>
  </div>
</template>
