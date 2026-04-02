<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'error' },
})

const visible = ref(false)
let hideTimer = null

watch(() => props.message, (msg) => {
  if (hideTimer) clearTimeout(hideTimer)
  visible.value = !!msg
  if (msg) {
    hideTimer = setTimeout(() => { visible.value = false }, 8000)
  }
}, { immediate: true })
</script>

<template>
  <div
    v-if="message"
    :class="['message-bar', type, { visible }]"
    role="alert"
    aria-live="polite"
  >
    <span>⚠</span> {{ message }}
  </div>
</template>
