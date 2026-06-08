import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game.js'

// ── Module mocks ─────────────────────────────────────────────────────────────

const { navigateToPhase } = vi.hoisted(() => ({ navigateToPhase: vi.fn() }))
vi.mock('@/composables/useNavigation.js', () => ({ useNavigation: () => ({ navigateToPhase }) }))
vi.mock('@/api/index.js', () => ({
  generateEpilogueBook: vi.fn(),
  saveJournalEntry: vi.fn(),
  advanceEpilogue: vi.fn(),
  rollEpilogueAction: vi.fn(),
  rollEpilogueFinal: vi.fn(),
}))

import * as API from '@/api/index.js'
import EpilogueView from './EpilogueView.vue'

const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false, messages: { en: {} } })

const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
  BookReveal: { props: ['book'], emits: ['complete'], template: '<button class="book-reveal-stub" @click="$emit(\'complete\')">reveal</button>' },
  DiceRoll: { props: ['result', 'context', 'extraData'], emits: ['complete'], template: '<button class="dice-roll-stub" @click="$emit(\'complete\')">dice</button>' },
  AttributeSelector: {
    props: ['attributes', 'usedAttributes', 'selectedAttribute', 'showSupport', 'supportUsed', 'selectedSupport'],
    emits: ['select', 'select-support'],
    template: '<button class="attr-stub" @click="$emit(\'select\', \'body\')">attr</button>',
  },
}

function seed(game) {
  const store = useGameStore()
  store.setGame({ id: 'g1', attributes: [], roll_results: [], ...game })
  return store
}

function mountEpilogue() {
  return mount(EpilogueView, { global: { plugins: [i18n], stubs } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  window.scrollTo = vi.fn() // jsdom does not implement scrollTo
})

// ── subState selection ────────────────────────────────────────────────────────

describe('EpilogueView — sub-state selection', () => {
  it('shows the book-discovery screen at the epilogue_book phase', () => {
    seed({ current_phase: 'epilogue_book', books: [] })
    const wrapper = mountEpilogue()
    expect(wrapper.find('#epilogue-book-container').exists()).toBe(true)
    expect(wrapper.find('.attr-stub').exists()).toBe(false)
  })

  it('shows the action screen at the epilogue_action_1 phase', () => {
    seed({ current_phase: 'epilogue_action_1', books: [{ phase: 'epilogue_book' }], overcome_score: 0 })
    const wrapper = mountEpilogue()
    expect(wrapper.find('.attr-stub').exists()).toBe(true)
    expect(wrapper.find('#epilogue-book-container').exists()).toBe(false)
  })

  it('shows the final screen at epilogue_final', () => {
    seed({ current_phase: 'epilogue_final', books: [{ phase: 'epilogue_action_1' }], overcome_score: 5 })
    const wrapper = mountEpilogue()
    expect(wrapper.text()).toContain('5') // accumulated overcome score is displayed
    expect(wrapper.find('.dice-roll-stub').exists()).toBe(true)
  })
})

// ── Action roll flow ──────────────────────────────────────────────────────────

describe('EpilogueView — action roll', () => {
  it('shows the post-roll journal after the dice resolve and requires content to continue', async () => {
    seed({ current_phase: 'epilogue_action_1', books: [{ phase: 'epilogue_book' }], overcome_score: 0 })
    // The roll does NOT advance the phase any more (backend change).
    API.rollEpilogueAction.mockResolvedValueOnce({
      game: { id: 'g1', current_phase: 'epilogue_action_1', attributes: [], roll_results: [], overcome_score: 3, books: [{ phase: 'epilogue_book' }] },
      roll_result: { outcome: 'hit' },
    })
    API.saveJournalEntry.mockResolvedValue({})
    // Advancing happens on the post-roll continue.
    API.advanceEpilogue.mockResolvedValue({ id: 'g1', current_phase: 'epilogue_action_2', attributes: [], roll_results: [], overcome_score: 3, books: [{ phase: 'epilogue_book' }] })

    const wrapper = mountEpilogue()
    await wrapper.find('.attr-stub').trigger('click')             // select attribute
    await wrapper.find('button.btn-primary').trigger('click')     // roll action
    await flushPromises()
    await wrapper.find('.dice-roll-stub').trigger('click') // action dice complete

    expect(wrapper.find('#epilogue-post-roll-section').exists()).toBe(true)

    // Empty post-roll journal is blocked (no save, no advance).
    await wrapper.find('#epilogue-post-roll-section button').trigger('click')
    await flushPromises()
    expect(API.saveJournalEntry).not.toHaveBeenCalled()
    expect(API.advanceEpilogue).not.toHaveBeenCalled()

    // With content it saves the journal and then advances the epilogue.
    await wrapper.find('#epilogue-post-roll-section textarea').setValue('After the action')
    await wrapper.find('#epilogue-post-roll-section button').trigger('click')
    await flushPromises()
    expect(API.saveJournalEntry).toHaveBeenCalledTimes(1)
    expect(API.advanceEpilogue).toHaveBeenCalledWith('g1')
  })
})

// ── Final roll flow ───────────────────────────────────────────────────────────

describe('EpilogueView — final roll', () => {
  it('disables the final roll button once it has been rolled', async () => {
    seed({ current_phase: 'epilogue_final', books: [{ phase: 'epilogue_action_1' }], overcome_score: 7 })
    API.rollEpilogueFinal.mockResolvedValueOnce({
      game: { id: 'g1', current_phase: 'completed', attributes: [], roll_results: [], overcome_score: 7, books: [{ phase: 'epilogue_action_1' }] },
      roll_result: { outcome: 'hit' },
    })

    const wrapper = mountEpilogue()
    const rollBtn = wrapper.find('.card button.btn-lg')
    expect(rollBtn.element.disabled).toBe(false)

    await rollBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.card button.btn-lg').element.disabled).toBe(true)
  })

  it('navigates to the completed view after writing the closing journal entry', async () => {
    seed({ current_phase: 'epilogue_final', books: [{ phase: 'epilogue_action_1' }], overcome_score: 7 })
    API.rollEpilogueFinal.mockResolvedValueOnce({
      game: { id: 'g1', current_phase: 'completed', attributes: [], roll_results: [], overcome_score: 7, books: [{ phase: 'epilogue_action_1' }] },
      roll_result: { outcome: 'hit' },
    })
    API.saveJournalEntry.mockResolvedValue({})

    const wrapper = mountEpilogue()
    await wrapper.find('.card button.btn-lg').trigger('click') // roll final
    await flushPromises()
    await wrapper.find('.dice-roll-stub').trigger('click')      // final dice complete

    expect(wrapper.find('#epilogue-post-final-section').exists()).toBe(true)

    // Empty closing entry is blocked.
    const finishBtn = wrapper.findAll('button.btn-lg').at(-1)
    await finishBtn.trigger('click')
    await flushPromises()
    expect(navigateToPhase).not.toHaveBeenCalled()

    await wrapper.find('#epilogue-post-final-section textarea').setValue('The end.')
    await wrapper.findAll('button.btn-lg').at(-1).trigger('click')
    await flushPromises()

    expect(API.saveJournalEntry).toHaveBeenCalled()
    expect(navigateToPhase).toHaveBeenCalledWith('completed')
  })
})
