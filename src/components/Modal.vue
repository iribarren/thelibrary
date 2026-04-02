<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
})
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal" role="dialog" :aria-modal="open" :aria-label="title">
        <button class="modal-close" aria-label="Cerrar" @click="$emit('close')">✕</button>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
