<script lang="ts" setup>
import Nav from "@/entrypoints/options/partials/Nav.vue";
import Aside from "@/entrypoints/options/partials/Aside.vue";
import Main from "@/entrypoints/options/partials/Main.vue";
</script>

<template>
<!--Using flowbite template and components-->
<!--https://flowbite.com/blocks/application/sidenav/-->

  <div class="antialiased bg-gray-50 dark:bg-gray-900 h-screen">
    <Nav></Nav>
    <Aside></Aside>
    <Main></Main>
  </div>
</template>


<style>
/* vue-color Chrome picker: dark mode */
.dark .color-picker-popover .vc-chrome {
  background: #374151;
  box-shadow: 0 0 2px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.3);
}
.dark .color-picker-popover .vc-chrome-body {
  background: #374151;
}
.dark .color-picker-popover .vc-input__input {
  background: #1f2937;
  color: #f9fafb;
  border-color: #4b5563;
  box-shadow: none;
}
.dark .color-picker-popover .vc-input__label {
  color: #9ca3af;
}
.dark .color-picker-popover .vc-chrome-toggle-icon path {
  fill: #9ca3af;
}
.dark .color-picker-popover .vc-chrome-toggle-icon-highlight {
  background: #4b5563;
}
</style>
