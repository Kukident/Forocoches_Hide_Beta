<script setup lang="ts">
import Multiselect from '@vueform/multiselect';

const props = defineProps<{
  modelValue: string[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const tagsMode = ref(true);
const textareaValue = ref('');

const internalValue = computed({
  get: () => props.modelValue,
  set: (val: string[]) => emit('update:modelValue', val),
});

watch(tagsMode, (isTagsNow) => {
  if (isTagsNow) {
    // textarea → tags
    const parsed = textareaValue.value
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    emit('update:modelValue', [...new Set(parsed)]);
  } else {
    // tags → textarea
    textareaValue.value = props.modelValue.join(', ');
  }
});

const msClasses = {
  container: 'relative w-full flex items-center justify-end box-border cursor-pointer border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm leading-snug outline-none min-h-[42px]',
  containerActive: 'ring-2 ring-blue-500/30 border-blue-500',
  wrapper: 'relative w-full flex items-center justify-end box-border cursor-pointer outline-none',
  tags: 'flex-grow flex-shrink flex flex-wrap items-center mt-1 pl-2 min-w-0',
  tag: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium py-1 pl-2.5 pr-1 rounded-md mr-1.5 mb-1 flex items-center whitespace-nowrap min-w-0',
  tagRemove: 'flex items-center justify-center p-0.5 ml-1 rounded-sm hover:bg-blue-200 dark:hover:bg-blue-800/50',
  tagRemoveIcon: 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%2018L18%206M6%206l12%2012%22%2F%3E%3C%2Fsvg%3E")] bg-center bg-no-repeat opacity-40 inline-block w-3 h-3',
  tagsSearchWrapper: 'inline-block relative mx-1 mb-1 flex-grow flex-shrink h-full',
  tagsSearch: 'absolute inset-0 border-0 outline-none focus:ring-0 appearance-none p-0 text-sm font-sans box-border w-full bg-transparent text-gray-900 dark:text-white',
  tagsSearchCopy: 'invisible whitespace-pre-wrap inline-block h-px',
  placeholder: 'flex items-center h-full absolute left-0 top-0 pointer-events-none bg-transparent leading-snug pl-3 text-gray-400 dark:text-gray-500 text-sm',
  caret: 'hidden',
  dropdown: 'hidden',
  noOptions: 'hidden',
  noResults: 'hidden',
  fakeInput: 'bg-transparent absolute left-0 right-0 -bottom-px w-full h-px border-0 p-0 appearance-none outline-none text-transparent',
  assist: 'absolute -m-px w-px h-px overflow-hidden',
  spacer: 'h-9 py-px box-content',
};
</script>

<template>
  <div>
    <div class="flex items-center justify-end mb-1">
      <button
        @click="tagsMode = !tagsMode"
        class="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        :title="tagsMode ? 'Cambiar a texto plano' : 'Cambiar a etiquetas'"
      >
        <svg v-if="tagsMode" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        {{ tagsMode ? 'Texto' : 'Etiquetas' }}
      </button>
    </div>

    <!-- Modo tags -->
    <Multiselect
      v-if="tagsMode"
      v-model="internalValue"
      mode="tags"
      :create-option="true"
      :searchable="true"
      :close-on-select="false"
      :options="internalValue"
      :add-option-on="['enter', ',']"
      no-options-text=""
      no-results-text=""
      :placeholder="placeholder ?? 'Escribe y pulsa Enter o coma...'"
      :classes="msClasses"
    />

    <!-- Modo textarea -->
    <div v-else>
      <textarea
        v-model="textareaValue"
        rows="4"
        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        :placeholder="placeholder ?? 'Palabras separadas por comas...'"
      ></textarea>
      <p class="text-xs text-gray-400 mt-1">Separa con comas. Se aplicará al cambiar a etiquetas.</p>
    </div>
  </div>
</template>
