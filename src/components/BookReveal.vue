<script setup>
import { ref, onMounted } from 'vue'
import { animateBookReveal } from '@/animators/book-animator.js'

const props = defineProps({
  book: { type: Object, required: true },
})
const emit = defineEmits(['complete'])

const container = ref(null)

onMounted(async () => {
  if (container.value && props.book) {
    await animateBookReveal(container.value, props.book)
    emit('complete')
  }
})
</script>

<template>
  <div ref="container" class="book-animator-container" />
</template>
