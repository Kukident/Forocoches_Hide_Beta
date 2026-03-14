<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { browser } from 'wxt/browser'

const version = ref('')
const openSection = ref<number | null>(null)

function toggleSection(idx: number) {
  openSection.value = openSection.value === idx ? null : idx;
}

onMounted(() => {
  version.value = browser.runtime.getManifest().version
})

const helpSections = [
  {
    title: '¿Cómo funciona?',
    content: 'Forocoches+ analiza los hilos del foro y oculta automáticamente aquellos cuyo título contiene alguna de las palabras que hayas configurado, o que hayan sido creados por usuarios que hayas bloqueado. La configuración es independiente por subforo.',
  },
  {
    title: 'Añadir filtros desde el popup',
    html: `<ol class="list-decimal list-inside space-y-2"><li>Navega a cualquier subforo de Forocoches.</li><li>Haz clic en el icono de la extensión en la barra de herramientas.</li><li>Escribe las palabras o el nombre de usuario y pulsa <kbd class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">Intro</kbd> o <kbd class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">,</kbd> para añadirlos.</li><li>Pulsa <strong>Guardar</strong>. Los hilos que coincidan desaparecerán al instante.</li></ol>`,
  },
  {
    title: 'Gestionar filtros desde esta página',
    html: `<ol class="list-decimal list-inside space-y-2"><li>En la página <strong>Foro</strong>, selecciona el subforo en el desplegable.</li><li>Usa las pestañas <strong>Palabras</strong> / <strong>Usuarios</strong>.</li><li>Añade o elimina etiquetas y pulsa <strong>Guardar</strong>.</li><li>Usa <strong>Limpiar foro</strong> para borrar todos los filtros del subforo.</li></ol>`,
  },
  {
    title: 'Desactivar la extensión temporalmente',
    content: 'Desde la página Foro puedes desactivar el filtrado globalmente con el toggle "Extensión activa". Los filtros se conservan pero no se aplican hasta que vuelvas a activarla.',
  },
  {
    title: 'Copia de seguridad',
    content: 'En esta misma página puedes exportar toda tu configuración a un archivo JSON y restaurarla más tarde con la opción de importar.',
  },
]
</script>

<template>
  <h1 class="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Acerca de</h1>

  <div class="space-y-4">
    <!-- About -->
    <div class="p-5 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <img src="/icon/128.png" alt="Forocoches+" class="w-12 h-12 rounded-xl" />
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Forocoches+</h2>
        </div>
        <span class="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800">
          v{{ version }}
        </span>
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-3">
        Extensión para Chrome y Firefox que te permite ocultar hilos en Forocoches por palabras clave o nombre de usuario, con configuración independiente por subforo.
      </p>
      <p class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        Forocoches+ es un proyecto independiente, no afiliado, asociado ni respaldado por
        forocoches.com ni por sus propietarios. "Forocoches" es una marca registrada
        propiedad de su legítimo titular. Esta extensión no accede a datos de usuario ni
        modifica el funcionamiento del foro; solo actúa sobre la presentación visual en el
        navegador del usuario.
      </p>
    </div>

    <!-- Help accordion -->
    <div class="bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
      <div class="px-5 pt-4 pb-2">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Ayuda</h2>
      </div>
      <div v-for="(section, idx) in helpSections" :key="idx" class="border-t border-gray-200 dark:border-gray-700">
        <button
          @click="toggleSection(idx)"
          class="flex items-center justify-between w-full px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span class="text-sm font-medium text-gray-900 dark:text-white">{{ section.title }}</span>
          <svg
            :class="{ 'rotate-180': openSection === idx }"
            class="w-4 h-4 text-gray-500 transition-transform"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="openSection === idx" class="px-5 pb-4">
          <p v-if="section.content" class="text-sm text-gray-600 dark:text-gray-400">{{ section.content }}</p>
          <div v-if="section.html" class="text-sm text-gray-600 dark:text-gray-400" v-html="section.html"></div>
        </div>
      </div>
    </div>
  </div>
</template>
