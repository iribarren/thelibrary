import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import PhaseStepper from './PhaseStepper.vue'
import { useGameStore } from '@/stores/game.js'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} } })

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

function mountStepper() {
  return mount(PhaseStepper, { global: { plugins: [i18n] } })
}

// Step order from the component:
// prologue, chapter_1..3, epilogue_book, epilogue_action_1..3, epilogue_final, completed

function statusOf(wrapper, key) {
  const steps = wrapper.findAll('.phase-step')
  const order = ['prologue', 'chapter_1', 'chapter_2', 'chapter_3', 'epilogue_book',
    'epilogue_action_1', 'epilogue_action_2', 'epilogue_action_3', 'epilogue_final', 'completed']
  const el = steps[order.indexOf(key)]
  if (el.classes().includes('completed')) return 'completed'
  if (el.classes().includes('active')) return 'active'
  return 'pending'
}

describe('PhaseStepper', () => {
  it('marks earlier steps completed, the current one active and later ones pending', () => {
    const game = useGameStore()
    game.game = { current_phase: 'chapter_2' }
    const wrapper = mountStepper()

    expect(statusOf(wrapper, 'prologue')).toBe('completed')
    expect(statusOf(wrapper, 'chapter_1')).toBe('completed')
    expect(statusOf(wrapper, 'chapter_2')).toBe('active')
    expect(statusOf(wrapper, 'chapter_3')).toBe('pending')
    expect(statusOf(wrapper, 'completed')).toBe('pending')
  })

  it('shows "epilogue_book" as active at the epilogue_book phase', () => {
    const game = useGameStore()
    game.game = { current_phase: 'epilogue_book' }
    const wrapper = mountStepper()

    expect(statusOf(wrapper, 'chapter_3')).toBe('completed')
    expect(statusOf(wrapper, 'epilogue_book')).toBe('active')
    expect(statusOf(wrapper, 'epilogue_action_1')).toBe('pending')
  })

  it('shows "epilogue_action_1" as active at the epilogue_action_1 phase', () => {
    const game = useGameStore()
    game.game = { current_phase: 'epilogue_action_1' }
    const wrapper = mountStepper()

    expect(statusOf(wrapper, 'epilogue_book')).toBe('completed')
    expect(statusOf(wrapper, 'epilogue_action_1')).toBe('active')
  })
})
