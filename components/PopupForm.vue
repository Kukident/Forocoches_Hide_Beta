<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import {
  getRawForumFilters,
  save_words,
  readLocalData,
} from '@/components/hideThreads/storageUtils';

const props = defineProps<{
  foro: string;
  type: 'banwords' | 'banusers';
}>();

const items = ref<string[]>([]);
const inputValue = ref('');
const saving = ref(false);
const saveStatus = ref<'idle' | 'success' | 'error'>('idle');

const loadItems = async () => {
  const data = await readLocalData();
  const result = getRawForumFilters(data, props.foro);
  items.value = result[props.type];
};

onMounted(loadItems);
watch(() => [props.foro, props.type], loadItems);

const saveItems = async (newItems: string[]) => {
  if (saving.value) return;
  saving.value = true;
  try {
    await save_words(props.foro, props.type, newItems);
    items.value = [...newItems].sort();
    saveStatus.value = 'success';
    setTimeout(() => { saveStatus.value = 'idle'; }, 1500);
  } catch {
    saveStatus.value = 'error';
    setTimeout(() => { saveStatus.value = 'idle'; }, 1500);
  } finally {
    saving.value = false;
  }
};

const removeItem = (index: number) => {
  saveItems(items.value.filter((_, i) => i !== index));
};

const addFromInput = () => {
  if (!inputValue.value.trim() || saving.value) return;
  const parsed = inputValue.value.toLowerCase()
    .replace(/( *, *,*)/g, ',')
    .trim()
    .split(',')
    .map(w => w.trim())
    .filter(w => w !== '');
  if (parsed.length === 0) return;
  const merged = [...new Set([...items.value, ...parsed])];
  inputValue.value = '';
  saveItems(merged);
};
</script>

<template>
  <div>
    <!-- Tags existentes -->
    <div v-if="items.length > 0" class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto mb-2 p-1">
      <span
        v-for="(item, i) in items"
        :key="item"
        class="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full"
      >
        {{ item }}
        <button
          @click="removeItem(i)"
          :disabled="saving"
          class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 leading-none transition-colors disabled:opacity-50"
          :title="`Eliminar ${item}`"
        >
          ×
        </button>
      </span>
    </div>

    <!-- Estado vacío -->
    <div v-else class="text-xs text-gray-400 dark:text-gray-500 italic mb-2 px-1">
      No hay {{ type === 'banwords' ? 'palabras' : 'usuarios' }} filtrados
    </div>

    <!-- Input + botón -->
    <div class="flex gap-2">
      <input
        v-model="inputValue"
        type="text"
        :placeholder="type === 'banwords' ? 'Añadir palabras...' : 'Añadir usuarios...'"
        @keydown.enter.prevent="addFromInput"
        class="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
      <button
        @click="addFromInput"
        :disabled="saving || !inputValue.trim()"
        :class="[
          'text-xs px-3 py-1.5 rounded text-white transition-colors disabled:opacity-50',
          saveStatus === 'success' ? 'bg-green-500' :
          saveStatus === 'error' ? 'bg-red-500' :
          'bg-blue-600 hover:bg-blue-700'
        ]"
      >
        {{ saveStatus === 'success' ? '✓' : saveStatus === 'error' ? '!' : '+' }}
      </button>
    </div>
  </div>
</template>
