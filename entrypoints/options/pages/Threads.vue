<script setup lang="ts">
import { useToast } from 'flowbite-vue';
import {
  readLocalData,
  saveFeatureConfig,
  DEFAULT_FEATURE_CONFIG, type FcFeatureConfig,
} from '@/components/hideThreads/storageUtils';
import ColorPicker from '@/components/ColorPicker.vue';
import { useRefreshOnVisible } from '@/components/composables/useRefreshOnVisible';

const toast = useToast();

const cfg = ref<FcFeatureConfig>({ ...DEFAULT_FEATURE_CONFIG });

useRefreshOnVisible(async () => {
  const data = await readLocalData();
  cfg.value = { ...DEFAULT_FEATURE_CONFIG, ...(data.s.features ?? {}) };
});

async function saveFeature<K extends keyof FcFeatureConfig>(key: K, value: FcFeatureConfig[K]) {
  cfg.value[key] = value;
  await saveFeatureConfig({ [key]: value });
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}
</script>

<template>
  <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Posts</h1>

  <div class="space-y-4">

    <!-- Ignorar usuarios en posts -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Ignorar usuarios en posts</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Oculta también los mensajes de los usuarios ocultados en la lista de foros.
          </p>
        </div>
        <button
          @click="saveFeature('ignoreUsersInPosts', !cfg.ignoreUsersInPosts)"
          :class="cfg.ignoreUsersInPosts ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.ignoreUsersInPosts ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
      <div v-if="cfg.ignoreUsersInPosts" class="mt-4 space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Modo de ocultamiento</label>
        <label class="flex items-start gap-2 cursor-pointer">
          <input type="radio" name="ignoreUsersMode" value="spoiler"
            :checked="cfg.ignoreUsersMode === 'spoiler'"
            @change="saveFeature('ignoreUsersMode', 'spoiler')"
            class="mt-0.5 text-blue-600 focus:ring-blue-500" />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">Spoiler</span>
            <p class="text-xs text-gray-500 dark:text-gray-400">Colapsa solo el contenido del mensaje. Avatar y nombre siguen visibles.</p>
          </div>
        </label>
        <label class="flex items-start gap-2 cursor-pointer">
          <input type="radio" name="ignoreUsersMode" value="hide"
            :checked="cfg.ignoreUsersMode === 'hide'"
            @change="saveFeature('ignoreUsersMode', 'hide')"
            class="mt-0.5 text-blue-600 focus:ring-blue-500" />
          <div>
            <span class="text-sm font-medium text-gray-900 dark:text-white">Ocultar completo</span>
            <p class="text-xs text-gray-500 dark:text-gray-400">Oculta todo el post. Solo queda un indicador mínimo clicable.</p>
          </div>
        </label>
      </div>
    </div>

    <!-- Resaltar mensajes del OP -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Resaltar mensajes del OP</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            En los hilos, resalta todos los mensajes del creador del hilo (OP).
          </p>
        </div>
        <button
          @click="saveFeature('highlightOP', !cfg.highlightOP)"
          :class="cfg.highlightOP ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.highlightOP ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
      <div v-if="cfg.highlightOP" class="mt-4 space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estilo</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="highlightOPMode" value="border"
                :checked="cfg.highlightOPMode === 'border'"
                @change="saveFeature('highlightOPMode', 'border')"
                class="text-blue-600 focus:ring-blue-500" />
              <span class="text-sm text-gray-900 dark:text-white">Banda lateral</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="highlightOPMode" value="background"
                :checked="cfg.highlightOPMode === 'background'"
                @change="saveFeature('highlightOPMode', 'background')"
                class="text-blue-600 focus:ring-blue-500" />
              <span class="text-sm text-gray-900 dark:text-white">Fondo completo</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
          <ColorPicker :model-value="cfg.highlightOPColor" @update:model-value="saveFeature('highlightOPColor', $event)" :presets="['#ca3415', '#fff3cd', '#e8f4f8', '#e8f8e8', '#fff0e0', '#fff8e0', '#f8e8e8', '#e8e8f8']" />
        </div>
      </div>
    </div>

    <!-- Resaltar usuarios VIP en posts -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Resaltar usuarios VIP en posts</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Resalta los mensajes de usuarios VIP dentro de los hilos.
            Gestiona los usuarios y sus colores desde la página <RouterLink to="/usuarios" class="text-blue-600 dark:text-blue-400 hover:underline">Usuarios</RouterLink>.
          </p>
        </div>
        <button
          @click="saveFeature('highlightVIPPosts', !cfg.highlightVIPPosts)"
          :class="cfg.highlightVIPPosts ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.highlightVIPPosts ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
      <div v-if="cfg.highlightVIPPosts" class="mt-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estilo</label>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="highlightVIPPostMode" value="border"
              :checked="cfg.highlightVIPPostMode === 'border'"
              @change="saveFeature('highlightVIPPostMode', 'border')"
              class="text-blue-600 focus:ring-blue-500" />
            <span class="text-sm text-gray-900 dark:text-white">Banda lateral</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="highlightVIPPostMode" value="background"
              :checked="cfg.highlightVIPPostMode === 'background'"
              @change="saveFeature('highlightVIPPostMode', 'background')"
              class="text-blue-600 focus:ring-blue-500" />
            <span class="text-sm text-gray-900 dark:text-white">Fondo completo</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Embeber vídeos WebM -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Embeber videos</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Convierte los enlaces a archivos de video (<code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">.webm</code>, <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">.mp4</code>, <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">.ogg</code>) en reproductores inline dentro de los posts.
          </p>
        </div>
        <button
          @click="saveFeature('embedWebm', !cfg.embedWebm)"
          :class="cfg.embedWebm ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.embedWebm ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
    </div>

    <!-- Progreso de lectura (desactivado temporalmente) -->
    <div v-if="false" class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Progreso de lectura</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Muestra la posicion actual en el hilo y permite volver a la ultima posicion leida.
          </p>
        </div>
        <button
          @click="saveFeature('readingProgress', !cfg.readingProgress)"
          :class="cfg.readingProgress ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none mt-0.5"
        >
          <span :class="cfg.readingProgress ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
    </div>

  </div>
</template>
