<script setup lang="ts">
import { FwbToggle, useToast } from 'flowbite-vue';
import {
  readLocalData, saveFeatureConfig,
  DEFAULT_FEATURE_CONFIG, getFeatureConfig,
  type FcFeatureConfig,
} from '@/components/hideThreads/storageUtils';
import ForumCards from '../components/ForumCards.vue';
import Groups from '../components/Groups.vue';
import ColorPicker from '@/components/ColorPicker.vue';
import { useRefreshOnVisible } from '@/components/composables/useRefreshOnVisible';

const toast = useToast();

const cfg = ref<FcFeatureConfig>({ ...DEFAULT_FEATURE_CONFIG });

useRefreshOnVisible(async () => {
  const data = await readLocalData();
  cfg.value = getFeatureConfig(data);
});

async function saveFeature<K extends keyof FcFeatureConfig>(key: K, value: FcFeatureConfig[K]) {
  cfg.value[key] = value;
  await saveFeatureConfig({ [key]: value });
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}

async function toggleHighlightThreads(val: boolean) {
  cfg.value.highlightThreads = val;
  await saveFeatureConfig({ highlightThreads: val });
}
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Resaltar</h1>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500 dark:text-gray-400">Resaltar hilos</span>
      <fwb-toggle v-model="cfg.highlightThreads" @update:modelValue="toggleHighlightThreads" />
    </div>
  </div>

  <div class="space-y-6">
    <!-- Cards de highlight por foro -->
    <ForumCards mode="highlight" />

    <!-- Modos rápidos de resaltado -->
    <Groups mode="highlight" />

    <!-- Identificar poles -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Identificar poles</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Resalta con un color diferente los hilos sin ninguna respuesta (0 replies) en la lista del foro.
          </p>
        </div>
        <button
          @click="saveFeature('highlightPoles', !cfg.highlightPoles)"
          :class="cfg.highlightPoles ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.highlightPoles ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
      <div v-if="cfg.highlightPoles" class="mt-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color de fondo</label>
        <ColorPicker :model-value="cfg.highlightPolesColor" @update:model-value="saveFeature('highlightPolesColor', $event)" />
      </div>
    </div>

    <!-- Resaltar usuarios VIP -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Resaltar usuarios VIP</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Resalta los hilos iniciados por usuarios VIP en la lista del foro.
            Gestiona los usuarios y sus colores desde la página <RouterLink to="/usuarios" class="text-blue-600 dark:text-blue-400 hover:underline">Usuarios</RouterLink>.
          </p>
        </div>
        <button
          @click="saveFeature('highlightVIP', !cfg.highlightVIP)"
          :class="cfg.highlightVIP ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.highlightVIP ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
    </div>
  </div>
</template>
