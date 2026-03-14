<script setup lang="ts">
import {
  FwbButton,
  FwbInput,
  useToast,
} from 'flowbite-vue';
import {
  readLocalData, saveUser, saveFeatureConfig,
  DEFAULT_FEATURE_CONFIG, getFeatureConfig,
  type FcFeatureConfig, type FcUserEntry,
} from '@/components/hideThreads/storageUtils';
import ColorPicker from '@/components/ColorPicker.vue';
import { useRefreshOnVisible } from '@/components/composables/useRefreshOnVisible';

const toast = useToast();

const cfg = ref<FcFeatureConfig>({ ...DEFAULT_FEATURE_CONFIG });
const usersList = ref<{ username: string; entry: FcUserEntry }[]>([]);
const newUsername = ref('');
const expandedUser = ref<string | null>(null);

useRefreshOnVisible(async () => {
  const data = await readLocalData();
  cfg.value = getFeatureConfig(data);
  usersList.value = Object.entries(data.users ?? {}).map(([username, entry]) => ({
    username,
    entry: { ...entry },
  }));
});

async function saveFeature<K extends keyof FcFeatureConfig>(key: K, value: FcFeatureConfig[K]) {
  cfg.value[key] = value;
  await saveFeatureConfig({ [key]: value });
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}

async function addUser() {
  const u = newUsername.value.trim().toLowerCase();
  if (!u) return;
  if (usersList.value.some(e => e.username === u)) {
    toast.add({ type: 'warning', time: 2000, text: 'El usuario ya existe' });
    return;
  }
  const entry: FcUserEntry = { highlightThread: true, highlightPost: true };
  usersList.value.push({ username: u, entry: { ...entry } });
  newUsername.value = '';
  expandedUser.value = u;
  await saveUser(u, entry);
  toast.add({ type: 'success', time: 2000, text: 'Usuario añadido' });
}

async function deleteUser(idx: number) {
  const { username } = usersList.value[idx];
  if (expandedUser.value === username) expandedUser.value = null;
  usersList.value.splice(idx, 1);
  await saveUser(username, null);
  toast.add({ type: 'success', time: 2000, text: 'Usuario eliminado' });
}

async function updateUser(idx: number) {
  const { username, entry } = usersList.value[idx];
  await saveUser(username, entry);
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}

async function updateNote(idx: number) {
  const { username, entry } = usersList.value[idx];
  if (!entry.note?.trim()) {
    delete entry.note;
  }
  await saveUser(username, entry);
}

async function toggleHighlightThread(idx: number) {
  const entry = usersList.value[idx].entry;
  entry.highlightThread = !entry.highlightThread;
  if (!entry.highlightThread) delete entry.threadColor;
  await updateUser(idx);
}

async function toggleHighlightPost(idx: number) {
  const entry = usersList.value[idx].entry;
  entry.highlightPost = !entry.highlightPost;
  if (!entry.highlightPost) delete entry.postColor;
  await updateUser(idx);
}

async function setThreadColor(idx: number, color: string) {
  usersList.value[idx].entry.threadColor = color;
  await updateUser(idx);
}

async function setPostColor(idx: number, color: string) {
  usersList.value[idx].entry.postColor = color;
  await updateUser(idx);
}

async function resetThreadColor(idx: number) {
  delete usersList.value[idx].entry.threadColor;
  await updateUser(idx);
}

async function resetPostColor(idx: number) {
  delete usersList.value[idx].entry.postColor;
  await updateUser(idx);
}

function toggleExpand(username: string) {
  expandedUser.value = expandedUser.value === username ? null : username;
}
</script>

<template>
  <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Usuarios VIP</h1>

  <div class="space-y-4">

    <!-- Configuración: colores por defecto + toggle notas -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Configuración</h2>

      <!-- Colores por defecto en una fila -->
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-700 dark:text-gray-300">Color en hilos</span>
          <ColorPicker :model-value="cfg.highlightVIPThreadColor" @update:model-value="saveFeature('highlightVIPThreadColor', $event)" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-700 dark:text-gray-300">Color en posts</span>
          <ColorPicker :model-value="cfg.highlightVIPPostColor" @update:model-value="saveFeature('highlightVIPPostColor', $event)" />
        </div>
      </div>

      <!-- Toggle notas -->
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm text-gray-700 dark:text-gray-300">Mostrar notas de usuario</span>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">En la lista de hilos y dentro de los hilos</p>
        </div>
        <button
          @click="saveFeature('userNotes', !cfg.userNotes)"
          :class="cfg.userNotes ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
        >
          <span :class="cfg.userNotes ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 rounded-full bg-white transition-transform" />
        </button>
      </div>
    </div>

    <!-- Añadir usuario -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-3">Añadir usuario</h2>
      <div class="flex gap-2 items-end">
        <div class="flex-1">
          <fwb-input v-model="newUsername" placeholder="Nombre de usuario" size="sm" @keyup.enter="addUser" />
        </div>
        <fwb-button size="sm" @click="addUser" :disabled="!newUsername.trim()">
          Añadir
        </fwb-button>
      </div>
    </div>

    <!-- Lista de usuarios -->
    <div v-if="usersList.length === 0" class="text-sm text-gray-400 dark:text-gray-500 text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
      No hay usuarios todavía
    </div>

    <div v-else class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
      <div v-for="(item, idx) in usersList" :key="item.username">
        <!-- Fila colapsada -->
        <div
          class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          @click="toggleExpand(item.username)"
        >
          <!-- Chevron -->
          <svg
            :class="{ 'rotate-90': expandedUser === item.username }"
            class="w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0"
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>

          <!-- Username -->
          <span class="text-sm font-bold text-gray-900 dark:text-white">{{ item.username }}</span>

          <!-- Preview nota (truncada) -->
          <span v-if="item.entry.note" class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
            "{{ item.entry.note }}"
          </span>

          <div class="flex-1" />

          <!-- Bolitas de color -->
          <div class="flex items-center gap-1.5">
            <span
              v-if="item.entry.highlightThread"
              class="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0"
              :style="{ backgroundColor: item.entry.threadColor ?? cfg.highlightVIPThreadColor }"
              title="Color en hilos"
            />
            <span
              v-if="item.entry.highlightPost"
              class="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0"
              :style="{ backgroundColor: item.entry.postColor ?? cfg.highlightVIPPostColor }"
              title="Color en posts"
            />
          </div>

          <!-- Botón eliminar -->
          <button
            @click.stop="deleteUser(idx)"
            class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 p-1"
            title="Eliminar usuario"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Panel expandido -->
        <div v-if="expandedUser === item.username" class="px-4 pb-4 pt-1 bg-gray-50 dark:bg-gray-700/30 space-y-3">
          <!-- Nota -->
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nota</label>
            <input
              v-model="item.entry.note"
              @blur="updateNote(idx)"
              @keyup.enter="updateNote(idx)"
              type="text"
              maxlength="256"
              placeholder="Escribe una nota..."
              class="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              @click.stop
            />
            <p class="text-xs mt-0.5 text-right" :class="(item.entry.note?.length ?? 0) >= 240 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'">
              {{ item.entry.note?.length ?? 0 }}/256
            </p>
          </div>

          <!-- Resaltar en hilos -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700 dark:text-gray-300">Resaltar en hilos</span>
            <button
              @click.stop="toggleHighlightThread(idx)"
              :class="item.entry.highlightThread ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="item.entry.highlightThread ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
          <div v-if="item.entry.highlightThread" class="ml-4 flex items-center gap-2" @click.stop>
            <template v-if="item.entry.threadColor">
              <ColorPicker :model-value="item.entry.threadColor" @update:model-value="setThreadColor(idx, $event)" />
              <button @click="resetThreadColor(idx)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Restaurar por defecto</button>
            </template>
            <template v-else>
              <span class="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0" :style="{ backgroundColor: cfg.highlightVIPThreadColor }" />
              <span class="text-xs text-gray-400 dark:text-gray-500">Color por defecto</span>
              <button @click="setThreadColor(idx, cfg.highlightVIPThreadColor)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Personalizar</button>
            </template>
          </div>

          <!-- Resaltar en posts -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-700 dark:text-gray-300">Resaltar en posts</span>
            <button
              @click.stop="toggleHighlightPost(idx)"
              :class="item.entry.highlightPost ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
              class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            >
              <span :class="item.entry.highlightPost ? 'translate-x-5' : 'translate-x-1'" class="inline-block h-3 w-3 rounded-full bg-white transition-transform" />
            </button>
          </div>
          <div v-if="item.entry.highlightPost" class="ml-4 flex items-center gap-2" @click.stop>
            <template v-if="item.entry.postColor">
              <ColorPicker :model-value="item.entry.postColor" @update:model-value="setPostColor(idx, $event)" />
              <button @click="resetPostColor(idx)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Restaurar por defecto</button>
            </template>
            <template v-else>
              <span class="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0" :style="{ backgroundColor: cfg.highlightVIPPostColor }" />
              <span class="text-xs text-gray-400 dark:text-gray-500">Color por defecto</span>
              <button @click="setPostColor(idx, cfg.highlightVIPPostColor)" class="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Personalizar</button>
            </template>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
