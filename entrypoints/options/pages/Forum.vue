<script setup lang="ts">
import { FwbToggle, useToast } from 'flowbite-vue';
import {
  readLocalData, saveFeatureConfig,
  DEFAULT_FEATURE_CONFIG, getFeatureConfig,
  type FcFeatureConfig,
} from '@/components/hideThreads/storageUtils';
import ForumCards from '../components/ForumCards.vue';
import Groups from '../components/Groups.vue';
import { useRefreshOnVisible } from '@/components/composables/useRefreshOnVisible';

const toast = useToast();

const hideThreads = ref(DEFAULT_FEATURE_CONFIG.hideThreads);
const protectVIP = ref(DEFAULT_FEATURE_CONFIG.protectVIP);

useRefreshOnVisible(async () => {
  const data = await readLocalData();
  const features = getFeatureConfig(data);
  hideThreads.value = features.hideThreads;
  protectVIP.value = features.protectVIP;
});

async function toggleHideThreads(val: boolean) {
  hideThreads.value = val;
  await saveFeatureConfig({ hideThreads: val });
}

async function toggleProtectVIP() {
  protectVIP.value = !protectVIP.value;
  await saveFeatureConfig({ protectVIP: protectVIP.value });
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Ocultar</h1>
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500 dark:text-gray-400">Ocultar hilos</span>
      <fwb-toggle v-model="hideThreads" @update:modelValue="toggleHideThreads" />
    </div>
  </div>

  <div class="space-y-6">
    <ForumCards mode="hide" />
    <Groups mode="hide" />

    <!-- Proteger hilos de usuarios VIP -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Proteger hilos de usuarios VIP</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Los hilos de usuarios con resaltado activo (página <RouterLink to="/usuarios" class="text-blue-600 dark:text-blue-400 hover:underline">Usuarios</RouterLink>) no se ocultarán aunque coincidan con un filtro.
          </p>
        </div>
        <button
          @click="toggleProtectVIP"
          :class="protectVIP ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="protectVIP ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
    </div>
  </div>
</template>
