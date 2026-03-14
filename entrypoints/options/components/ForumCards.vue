<script setup lang="ts">
import {
  FwbButton,
  FwbModal,
  FwbSelect,
  useToast,
} from 'flowbite-vue';
import TagsInput from '@/components/TagsInput.vue';
import ColorPicker from '@/components/ColorPicker.vue';
import {
  readLocalData, save_words, save_forum_batch, saveForumConfig, saveFeatureConfig,
  getRawForumFilters, getFeatureConfig, foros,
  DEFAULT_FEATURE_CONFIG,
  type FilterForm, type FcFeatureConfig,
} from '@/components/hideThreads/storageUtils';

const props = defineProps<{ mode: 'hide' | 'highlight' }>();

type ForumEntry = {
  id: string;
  name: string;
  words: string[];
  users: string[];
  enabled: boolean;
};

const toast = useToast();
const entries = ref<ForumEntry[]>([]);

// Edicion inline
const editingId = ref<string | null>(null);
const editingWords = ref<string[]>([]);
const editingUsers = ref<string[]>([]);

// Modales
const showDeleteModal = ref(false);
const deletingId = ref<string | null>(null);
const showAddModal = ref(false);
const addForumSelected = ref('');

const cfg = ref<FcFeatureConfig>({ ...DEFAULT_FEATURE_CONFIG });

const indicatorKey = computed(() =>
  props.mode === 'hide' ? 'filterIndicatorHide' : 'filterIndicatorHighlight'
);

async function toggleIndicator() {
  const key = indicatorKey.value;
  const val = !cfg.value[key];
  cfg.value[key] = val;
  await saveFeatureConfig({ [key]: val });
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}

async function saveHighlightColor(color: string) {
  cfg.value.highlightThreadsColor = color;
  await saveFeatureConfig({ highlightThreadsColor: color });
  toast.add({ type: 'success', time: 2000, text: 'Guardado' });
}

const wordForm: FilterForm = props.mode === 'hide' ? 'banwords' : 'highlightwords';
const userForm: FilterForm = props.mode === 'hide' ? 'banusers' : 'highlightusers';
const wordField = props.mode === 'hide' ? 'banwords' : 'highlightwords';
const userField = props.mode === 'hide' ? 'banusers' : 'highlightusers';

function getForumName(id: string): string {
  return (foros[id]?.[0] as string) ?? `Foro ${id}`;
}

const availableForums = computed(() => {
  const existing = new Set(entries.value.map(e => e.id));
  return Object.keys(foros)
    .filter(id => id !== '*' && !existing.has(id))
    .map(id => ({ name: foros[id][0] as string, value: id }));
});

async function loadEntries() {
  const data = await readLocalData();
  cfg.value = getFeatureConfig(data);
  const result: ForumEntry[] = [];

  const globalRaw = getRawForumFilters(data, '*');
  const globalForo = data.f?.['*'];
  result.push({
    id: '*',
    name: 'Todos los foros',
    words: globalRaw[wordField],
    users: globalRaw[userField],
    enabled: globalForo?.c?.enabled !== false,
  });

  for (const [id, foroData] of Object.entries(data.f)) {
    if (id === '*') continue;
    const raw = getRawForumFilters(data, id);
    const hasDataForMode = raw[wordField].length > 0 || raw[userField].length > 0;
    if (hasDataForMode) {
      result.push({
        id,
        name: getForumName(id),
        words: raw[wordField],
        users: raw[userField],
        enabled: foroData.c?.enabled !== false,
      });
    }
  }

  entries.value = result;
}

onMounted(loadEntries);

async function handleToggle(id: string) {
  const entry = entries.value.find(e => e.id === id);
  if (!entry) return;
  const newEnabled = !entry.enabled;
  await saveForumConfig(id, { enabled: newEnabled });
  entry.enabled = newEnabled;
}

function startEdit(entry: ForumEntry) {
  editingId.value = entry.id;
  editingWords.value = [...entry.words];
  editingUsers.value = [...entry.users];
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit() {
  if (!editingId.value) return;
  const foroId = editingId.value;

  const words = [...new Set(editingWords.value.map(s => s.toLowerCase().trim()).filter(Boolean))];
  const users = [...new Set(editingUsers.value.map(s => s.toLowerCase().trim()).filter(Boolean))];

  await save_forum_batch(foroId, { [wordForm]: words, [userForm]: users });

  editingId.value = null;
  await loadEntries();
  toast.add({ type: 'success', time: 3000, text: 'Guardado' });
}

function openAddModal() {
  addForumSelected.value = availableForums.value[0]?.value ?? '';
  showAddModal.value = true;
}

async function addForum() {
  const foroId = addForumSelected.value;
  if (!foroId) return;
  showAddModal.value = false;

  entries.value.push({
    id: foroId,
    name: getForumName(foroId),
    words: [],
    users: [],
    enabled: true,
  });
  startEdit(entries.value[entries.value.length - 1]);
}

function confirmDelete(id: string) {
  deletingId.value = id;
  showDeleteModal.value = true;
}

async function doDelete() {
  if (!deletingId.value) return;
  const foroId = deletingId.value;

  await save_forum_batch(foroId, { [wordForm]: [], [userForm]: [] });

  showDeleteModal.value = false;
  if (editingId.value === foroId) editingId.value = null;
  deletingId.value = null;
  await loadEntries();
  toast.add({ type: 'success', time: 3000, text: 'Foro eliminado' });
}
</script>

<template>
  <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          {{ mode === 'hide' ? 'Filtros por foro' : 'Resaltado por foro' }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ mode === 'hide'
            ? 'Palabras y usuarios a ocultar en cada foro.'
            : 'Palabras y usuarios a resaltar en cada foro.' }}
        </p>
      </div>
      <fwb-button @click="openAddModal" size="sm" :disabled="availableForums.length === 0">
        + Añadir foro
      </fwb-button>
    </div>

    <!-- Opciones inline -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4 mt-1">
      <!-- Indicador de causa -->
      <label class="inline-flex items-center gap-2 cursor-pointer select-none">
        <button
          @click="toggleIndicator"
          :class="cfg[indicatorKey] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
          class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
        >
          <span
            :class="cfg[indicatorKey] ? 'translate-x-5' : 'translate-x-1'"
            class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
          />
        </button>
        <span class="text-sm text-gray-700 dark:text-gray-300">Indicador de causa</span>
      </label>

      <!-- Color de fondo (solo highlight) -->
      <div v-if="mode === 'highlight'" class="inline-flex items-center gap-2">
        <span class="text-sm text-gray-700 dark:text-gray-300">Color de fondo</span>
        <ColorPicker :model-value="cfg.highlightThreadsColor" @update:model-value="saveHighlightColor" />
      </div>
    </div>

    <!-- Sin entradas -->
    <div v-if="entries.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
      <svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <p class="text-sm font-medium">No hay foros configurados</p>
      <p class="text-xs mt-1">Añade un foro para empezar a {{ mode === 'hide' ? 'ocultar' : 'resaltar' }}</p>
    </div>

    <!-- Cards -->
    <ul v-else class="space-y-3">
      <li v-for="entry in entries" :key="entry.id">
        <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
          :class="{ 'rounded-b-none': editingId === entry.id }">
          <button
            @click="handleToggle(entry.id)"
            :class="entry.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
            class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            :title="entry.enabled ? 'Desactivar filtros' : 'Activar filtros'"
          >
            <span
              :class="entry.enabled ? 'translate-x-5' : 'translate-x-1'"
              class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
            />
          </button>
          <div class="flex-1 min-w-0 cursor-pointer" @click="editingId === entry.id ? cancelEdit() : startEdit(entry)">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate"
              :class="{ 'opacity-50': !entry.enabled }">
              {{ entry.name }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ entry.words.length }} {{ mode === 'hide' ? 'palabras' : 'pal. resaltadas' }} &middot;
              {{ entry.users.length }} {{ mode === 'hide' ? 'usuarios' : 'usu. resaltados' }}
            </p>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              v-if="entry.id !== '*'"
              @click="confirmDelete(entry.id)"
              class="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Eliminar"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              @click="editingId === entry.id ? cancelEdit() : startEdit(entry)"
              class="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              :title="editingId === entry.id ? 'Cerrar' : 'Editar'"
            >
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': editingId === entry.id }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Edicion inline -->
        <div v-if="editingId === entry.id"
          class="p-4 border border-t-0 border-gray-200 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-800 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ mode === 'hide' ? 'Palabras a ocultar' : 'Palabras a resaltar' }}
              <span class="text-xs font-normal text-gray-400">({{ editingWords.length }})</span>
            </label>
            <TagsInput
              v-model="editingWords"
              :placeholder="mode === 'hide' ? 'Añadir palabras a ocultar...' : 'Añadir palabras a resaltar...'"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ mode === 'hide' ? 'Usuarios a ocultar' : 'Usuarios a resaltar' }}
              <span class="text-xs font-normal text-gray-400">({{ editingUsers.length }})</span>
            </label>
            <TagsInput
              v-model="editingUsers"
              :placeholder="mode === 'hide' ? 'Añadir usuarios a ocultar...' : 'Añadir usuarios a resaltar...'"
            />
          </div>
          <div class="flex gap-2">
            <fwb-button @click="saveEdit" size="sm">Guardar</fwb-button>
            <fwb-button color="light" @click="cancelEdit" size="sm">Cancelar</fwb-button>
          </div>
        </div>
      </li>
    </ul>
  </div>

  <!-- Modal añadir foro -->
  <fwb-modal v-if="showAddModal" @close="showAddModal = false" size="sm">
    <template #header>
      <span class="text-base font-semibold text-gray-900 dark:text-white">Añadir foro</span>
    </template>
    <template #body>
      <fwb-select
        v-model="addForumSelected"
        :options="availableForums"
        label="Selecciona un foro"
      />
    </template>
    <template #footer>
      <div class="flex gap-2">
        <fwb-button @click="addForum" :disabled="!addForumSelected">Añadir</fwb-button>
        <fwb-button color="light" @click="showAddModal = false">Cancelar</fwb-button>
      </div>
    </template>
  </fwb-modal>

  <!-- Modal confirmar borrado -->
  <fwb-modal v-if="showDeleteModal" @close="showDeleteModal = false" size="sm">
    <template #header>
      <span class="text-base font-semibold text-gray-900 dark:text-white">Eliminar foro</span>
    </template>
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        ¿Seguro que quieres eliminar los {{ mode === 'hide' ? 'filtros' : 'resaltados' }} de este foro?
      </p>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <fwb-button color="red" @click="doDelete">Eliminar</fwb-button>
        <fwb-button color="light" @click="showDeleteModal = false">Cancelar</fwb-button>
      </div>
    </template>
  </fwb-modal>
</template>
