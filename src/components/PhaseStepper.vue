<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/game.js'

const { t } = useI18n()
const gameStore = useGameStore()

const STEPS = [
  'prologue',
  'chapter_1', 'chapter_2', 'chapter_3',
  'epilogue_book',
  'epilogue_action_1', 'epilogue_action_2', 'epilogue_action_3',
  'epilogue_final', 'completed',
]

// The backend phase maps 1:1 to a visual step, including the dedicated
// 'epilogue_book' phase.
const currentVisualStep = computed(() => gameStore.currentPhase)

const steps = computed(() => {
  const currentIdx = STEPS.indexOf(currentVisualStep.value)
  return STEPS.map((step, i) => ({
    key: step,
    label: t(`phases.${step}`, step),
    status: i < currentIdx ? 'completed' : i === currentIdx ? 'active' : 'pending',
  }))
})
</script>

<template>
  <div id="sidebar-steps">
    <div
      v-for="step in steps"
      :key="step.key"
      :class="['phase-step', step.status]"
    >
      <div class="phase-step-dot">{{ step.status === 'completed' ? '✓' : '' }}</div>
      <span class="phase-step-label">{{ step.label }}</span>
    </div>
  </div>
</template>
