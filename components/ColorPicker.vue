<script setup lang="ts">
import { Chrome } from '@ckpack/vue-color';

const props = withDefaults(defineProps<{
  modelValue: string;
  presets?: string[];
}>(), {
  presets: () => ['#fff3cd', '#e8f4f8', '#e8f8e8', '#fff0e0', '#fff8e0', '#f8e8e8', '#e8e8f8', '#e8f8f0'],
});

const emit = defineEmits<{
  'update:modelValue': [color: string];
}>();

const showPicker = ref(false);
const popoverRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const pickerColor = ref(props.modelValue);

function onPickerChange(color: { hex: string }) {
  pickerColor.value = color.hex;
}

function closePicker() {
  if (showPicker.value) {
    showPicker.value = false;
    if (pickerColor.value !== props.modelValue) {
      emit('update:modelValue', pickerColor.value);
    }
  }
}

function togglePicker() {
  if (showPicker.value) {
    closePicker();
  } else {
    pickerColor.value = props.modelValue;
    showPicker.value = true;
  }
}

function onClickOutside(e: MouseEvent) {
  if (
    popoverRef.value && !popoverRef.value.contains(e.target as Node) &&
    triggerRef.value && !triggerRef.value.contains(e.target as Node)
  ) {
    closePicker();
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));
</script>

<template>
  <div class="flex flex-wrap gap-2 items-center relative">
    <button v-for="c in presets" :key="c"
      @click="emit('update:modelValue', c)"
      :style="{ background: c, outline: modelValue === c ? '2px solid #2563eb' : '1px solid #ccc' }"
      class="w-7 h-7 rounded cursor-pointer" :title="c"
    />
    <button ref="triggerRef"
      @click="togglePicker"
      :style="{ background: showPicker ? pickerColor : modelValue }"
      class="w-8 h-8 rounded border border-gray-300 dark:border-gray-500 cursor-pointer flex items-center justify-center"
      title="Color personalizado"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd" />
      </svg>
    </button>
    <span class="text-xs text-gray-400 ml-1">{{ modelValue }}</span>

    <div v-if="showPicker" ref="popoverRef"
      class="color-picker-popover absolute top-full left-0 mt-2 z-50 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
    >
      <Chrome :modelValue="pickerColor" @update:modelValue="onPickerChange" :disableAlpha="true" />
    </div>
  </div>
</template>
