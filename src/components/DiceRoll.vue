<script setup>
import { ref, watch, onMounted } from 'vue'
import { animateDiceRoll, buildDicePlaceholder } from '@/animators/dice-animator.js'

const props = defineProps({
  result:    { type: Object, default: null },
  context:   { type: String, required: true },
  extraData: { type: Object, default: null },
})
const emit = defineEmits(['complete'])

const container = ref(null)

onMounted(() => {
  if (container.value && !props.result) {
    container.value.appendChild(buildDicePlaceholder(props.context))
  }
})

// Trigger animation reactively when a result is set
watch(() => props.result, async (newResult) => {
  if (!newResult || !container.value) return
  container.value.innerHTML = ''
  await animateDiceRoll(container.value, newResult, props.context, props.extraData)
  emit('complete')
})
</script>

<template>
  <div ref="container" />
</template>
