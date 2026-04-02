<script setup>
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div id="game-layout" class="game-layout">
    <AppSidebar />
    <main id="main-content" class="main-content">
      <slot />
    </main>
  </div>
</template>
