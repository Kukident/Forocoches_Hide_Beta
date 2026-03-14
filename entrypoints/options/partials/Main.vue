<script lang="ts" setup>
import { RouterView } from 'vue-router'
import {FwbBreadcrumb, FwbBreadcrumbItem, FwbToast, FwbToastProvider} from "flowbite-vue";
</script>

<template>
  <main class="p-4 md:ml-64 h-auto pt-20">
    <fwb-toast-provider>
      <RouterView />
    </fwb-toast-provider>
  </main>
</template>

<style scoped>
</style>
