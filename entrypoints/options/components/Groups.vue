<script setup lang="ts">
import {
  FwbButton,
  FwbInput,
  FwbModal,
  useToast,
} from 'flowbite-vue';
import TagsInput from '@/components/TagsInput.vue';
import { readLocalData, saveGroup, setGroupVisible, reorderGroups, isGroupExpired, getRemainingLabel, type FcGroup } from '@/components/hideThreads/storageUtils';

type GroupEntry = { id: string; group: FcGroup };

const props = withDefaults(defineProps<{ mode?: 'hide' | 'highlight' }>(), { mode: 'hide' });

const toast = useToast();

const groups = ref<GroupEntry[]>([]);

// Edición inline
const editingId = ref<string | null>(null);
const editingName = ref('');
const editingWords = ref<string[]>([]);
const editingUsers = ref<string[]>([]);

// Modales
const showDeleteModal = ref(false);
const deletingId = ref<string | null>(null);
const showNewModal = ref(false);
const newGroupName = ref('');

async function loadGroups() {
  const data = await readLocalData();
  groups.value = Object.entries(data.g ?? {})
    .filter(([, g]) => props.mode === 'highlight' ? g.type === 'highlight' : g.type !== 'highlight')
    .map(([id, group]) => ({ id, group: { ...group } }));
}

onMounted(loadGroups);

async function createGroup() {
  const name = newGroupName.value.trim();
  if (!name) return;
  if (groups.value.some(e => e.group.name.toLowerCase() === name.toLowerCase())) {
    toast.add({ type: 'warning', time: 3000, text: 'Ya existe un modo rápido con ese nombre' });
    return;
  }
  const id = crypto.randomUUID();
  await saveGroup(id, { name, on: false, ...(props.mode === 'highlight' ? { type: 'highlight' } : {}) });
  newGroupName.value = '';
  showNewModal.value = false;
  await loadGroups();
  toast.add({ type: 'success', time: 3000, text: 'Modo rápido creado' });
}

async function handleVisibleToggle(entry: GroupEntry) {
  const visible = entry.group.visible === false;
  const updated = await setGroupVisible(entry.id, visible);
  if (updated) entry.group = updated;
}

function startEdit(entry: GroupEntry) {
  editingId.value = entry.id;
  editingName.value = entry.group.name;
  if (props.mode === 'highlight') {
    editingWords.value = [...(entry.group.hw ?? [])];
    editingUsers.value = [...(entry.group.hu ?? [])];
  } else {
    editingWords.value = [...(entry.group.w ?? [])];
    editingUsers.value = [...(entry.group.u ?? [])];
  }
}

async function saveEdit() {
  if (!editingId.value) return;
  const name = editingName.value.trim();
  if (!name) return;
  const words = [...new Set(editingWords.value.map(s => s.toLowerCase().trim()).filter(Boolean))];
  const users = [...new Set(editingUsers.value.map(s => s.toLowerCase().trim()).filter(Boolean))];
  const data = await readLocalData();
  const existing = data.g?.[editingId.value];
  const updated: FcGroup = {
    name,
    on: existing?.on ?? false,
    ...(existing?.type ? { type: existing.type } : {}),
    ...(props.mode === 'highlight'
      ? { ...(words.length > 0 ? { hw: words } : {}), ...(users.length > 0 ? { hu: users } : {}) }
      : { ...(words.length > 0 ? { w: words } : {}), ...(users.length > 0 ? { u: users } : {}) }
    ),
    ...(existing?.duration ? { duration: existing.duration } : {}),
    ...(existing?.activatedAt ? { activatedAt: existing.activatedAt } : {}),
    ...(existing?.visible === false ? { visible: false } : {}),
  };
  await saveGroup(editingId.value, updated);
  editingId.value = null;
  await loadGroups();
  toast.add({ type: 'success', time: 3000, text: 'Modo rápido guardado' });
}

function cancelEdit() {
  editingId.value = null;
}

function confirmDelete(id: string) {
  deletingId.value = id;
  showDeleteModal.value = true;
}

async function doDelete() {
  if (!deletingId.value) return;
  await saveGroup(deletingId.value, null);
  showDeleteModal.value = false;
  deletingId.value = null;
  if (editingId.value === deletingId.value) editingId.value = null;
  await loadGroups();
  toast.add({ type: 'success', time: 3000, text: 'Modo rápido eliminado' });
}

// -- Drag & drop para reordenar
const dragId = ref<string | null>(null);
let orderBeforeDrag: GroupEntry[] = [];
let committed = false;

function onDragStart(idx: number, e: DragEvent) {
  const el = e.currentTarget as HTMLElement;
  dragId.value = groups.value[idx].id;
  orderBeforeDrag = [...groups.value];
  committed = false;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    // Clon a tamaño real como drag ghost
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.width = `${el.offsetWidth}px`;
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, e.clientX - el.getBoundingClientRect().left, e.clientY - el.getBoundingClientRect().top);
    requestAnimationFrame(() => document.body.removeChild(clone));
  }
}

function onDragOver(idx: number, e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  if (!dragId.value) return;
  const currentIdx = groups.value.findIndex(g => g.id === dragId.value);
  if (currentIdx === -1 || currentIdx === idx) return;
  const arr = [...groups.value];
  const [moved] = arr.splice(currentIdx, 1);
  arr.splice(idx, 0, moved);
  groups.value = arr;
}

function onDragEnd() {
  if (!committed) {
    groups.value = orderBeforeDrag;
  }
  dragId.value = null;
  orderBeforeDrag = [];
}

async function onDrop(_targetIdx: number, e: DragEvent) {
  e.preventDefault();
  if (!dragId.value) return;
  committed = true;
  dragId.value = null;
  await reorderGroups(groups.value.map(e => e.id));
}
</script>

<template>
  <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Modos rápidos</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Grupos de filtros activables globalmente desde el popup.
        </p>
      </div>
      <fwb-button @click="showNewModal = true" size="sm">
        + Nuevo modo
      </fwb-button>
    </div>

    <!-- Sin grupos -->
    <div v-if="groups.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
      <svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p class="text-sm font-medium">No hay modos rápidos</p>
      <p class="text-xs mt-1">Crea uno para activarlo rápidamente desde el popup</p>
    </div>

    <!-- Tarjetas de grupos -->
    <ul v-else class="space-y-3">
      <li v-for="(entry, index) in groups" :key="entry.id"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragend="onDragEnd"
        @drop="onDrop(index, $event)"
        :class="dragId === entry.id ? 'opacity-50' : 'transition-transform duration-200'"
      >
        <!-- Fila del grupo -->
        <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
          :class="{ 'rounded-b-none': editingId === entry.id, 'opacity-50': entry.group.visible === false }">
          <!-- Grip handle -->
          <div class="cursor-grab active:cursor-grabbing flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/>
              <circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/>
              <circle cx="9" cy="20" r="1.5"/><circle cx="15" cy="20" r="1.5"/>
            </svg>
          </div>
          <!-- Toggle visible -->
          <button
            @click="handleVisibleToggle(entry)"
            :class="entry.group.visible !== false ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'"
            class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none"
            :title="entry.group.visible !== false ? 'Ocultar del popup' : 'Mostrar en popup'"
          >
            <span
              :class="entry.group.visible !== false ? 'translate-x-5' : 'translate-x-1'"
              class="inline-block h-3 w-3 rounded-full bg-white transition-transform"
            />
          </button>
          <div class="flex-1 min-w-0 cursor-pointer" @click="editingId === entry.id ? cancelEdit() : startEdit(entry)">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ entry.group.name }}</p>
              <!-- Badge activo -->
              <span
                v-if="entry.group.on && !isGroupExpired(entry.group)"
                class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                Activo
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              <template v-if="mode === 'highlight'">
                {{ (entry.group.hw?.length ?? 0) }} palabras &middot; {{ (entry.group.hu?.length ?? 0) }} usuarios
              </template>
              <template v-else>
                {{ (entry.group.w?.length ?? 0) }} palabras &middot; {{ (entry.group.u?.length ?? 0) }} usuarios
              </template>
              <template v-if="entry.group.on && getRemainingLabel(entry.group)">
                &middot; {{ getRemainingLabel(entry.group) }}
              </template>
            </p>
          </div>
          <div class="flex items-center gap-0.5 flex-shrink-0">
            <button
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

        <!-- Edición inline (se expande debajo) -->
        <div v-if="editingId === entry.id"
          class="p-4 border border-t-0 border-gray-200 dark:border-gray-600 rounded-b-lg bg-white dark:bg-gray-800 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del modo</label>
            <fwb-input v-model="editingName" placeholder="Ej: Fútbol, F1, Política..." />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ mode === 'highlight' ? 'Palabras a resaltar' : 'Palabras' }}
              <span class="text-xs font-normal text-gray-400">({{ editingWords.length }})</span>
            </label>
            <TagsInput v-model="editingWords" :placeholder="mode === 'highlight' ? 'Añadir palabras a resaltar...' : 'Añadir palabras...'" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ mode === 'highlight' ? 'Usuarios a resaltar' : 'Usuarios' }}
              <span class="text-xs font-normal text-gray-400">({{ editingUsers.length }})</span>
            </label>
            <TagsInput v-model="editingUsers" :placeholder="mode === 'highlight' ? 'Añadir usuarios a resaltar...' : 'Añadir usuarios...'" />
          </div>
          <div class="flex gap-2">
            <fwb-button @click="saveEdit" size="sm">Guardar</fwb-button>
            <fwb-button color="light" @click="cancelEdit" size="sm">Cancelar</fwb-button>
          </div>
        </div>
      </li>
    </ul>
  </div>

  <!-- Modal nuevo grupo -->
  <fwb-modal v-if="showNewModal" @close="showNewModal = false" size="sm">
    <template #header>
      <span class="text-base font-semibold text-gray-900 dark:text-white">Nuevo modo rápido</span>
    </template>
    <template #body>
      <fwb-input
        v-model="newGroupName"
        placeholder="Nombre del modo (ej: Fútbol)"
        label="Nombre"
        @keyup.enter="createGroup"
        autofocus
      />
    </template>
    <template #footer>
      <div class="flex gap-2">
        <fwb-button @click="createGroup" :disabled="!newGroupName.trim()">Crear</fwb-button>
        <fwb-button color="light" @click="showNewModal = false">Cancelar</fwb-button>
      </div>
    </template>
  </fwb-modal>

  <!-- Modal confirmar borrado -->
  <fwb-modal v-if="showDeleteModal" @close="showDeleteModal = false" size="sm">
    <template #header>
      <span class="text-base font-semibold text-gray-900 dark:text-white">Eliminar modo</span>
    </template>
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        ¿Seguro que quieres eliminar este modo rápido? Se perderán todas sus palabras y usuarios.
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
