import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game.js'

// ── Module mocks ─────────────────────────────────────────────────────────────

const { navigateToPhase } = vi.hoisted(() => ({ navigateToPhase: vi.fn() }))
vi.mock('@/composables/useNavigation.js', () => ({ useNavigation: () => ({ navigateToPhase }) }))
vi.mock('@/api/index.js', () => ({
  generateChapterBook: vi.fn(),
  saveJournalEntry: vi.fn(),
  rollChapter: vi.fn(),
  saveSupportTitle: vi.fn(),
  advanceChapter: vi.fn(),
}))

import * as API from '@/api/index.js'
import ChapterView from './ChapterView.vue'

const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false, messages: { en: {} } })

// Child component stubs that expose the relevant emits as clickable buttons.
const stubs = {
  AppLayout: { template: '<div><slot /></div>' },
  BookReveal: { props: ['book'], emits: ['complete'], template: '<button class="book-reveal-stub" @click="$emit(\'complete\')">reveal</button>' },
  DiceRoll: { props: ['result', 'context', 'extraData'], emits: ['complete'], template: '<button class="dice-roll-stub" @click="$emit(\'complete\')">dice</button>' },
  AttributeSelector: {
    props: ['attributes', 'usedAttributes', 'selectedAttribute', 'showSupport', 'supportUsed', 'selectedSupport'],
    emits: ['select', 'select-support'],
    template: '<button class="attr-stub" @click="$emit(\'select\', \'mind\')">attr</button>',
  },
}

function seedGame() {
  const game = useGameStore()
  game.setGame({
    id: 'g1',
    current_phase: 'chapter_1',
    attributes: [
      { type: 'body', base_value: 1, background: 0, support: 0 },
      { type: 'mind', base_value: 1, background: 0, support: 0 },
      { type: 'social', base_value: 1, background: 0, support: 0 },
    ],
    roll_results: [],
  })
  return game
}

function mountChapter() {
  return mount(ChapterView, { global: { plugins: [i18n], stubs } })
}

async function reachRollStep(wrapper) {
  await wrapper.find('#chapter-book-section button').trigger('click') // discover book
  await flushPromises()
  await wrapper.find('.book-reveal-stub').trigger('click')           // reveal complete → pre-journal
  await wrapper.find('#chapter-pre-journal-section textarea').setValue('Intro line')
  await wrapper.find('#chapter-pre-journal-section button').trigger('click') // → roll
  await flushPromises()
}

async function rollWithOutcome(wrapper, outcome) {
  API.rollChapter.mockResolvedValueOnce({
    game: { id: 'g1', current_phase: 'chapter_1', attributes: [], roll_results: [] },
    roll_result: { outcome },
  })
  await wrapper.find('.attr-stub').trigger('click') // select 'mind'
  await wrapper.find('#chapter-roll-section button.btn-primary').trigger('click')
  await flushPromises()
  await wrapper.find('.dice-roll-stub').trigger('click') // dice complete → branch
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  window.scrollTo = vi.fn() // jsdom does not implement scrollTo
  API.generateChapterBook.mockResolvedValue({ id: 10 })
  API.saveJournalEntry.mockResolvedValue({})
})

describe('ChapterView — step machine', () => {
  it('reveals the book before showing the pre-roll journal', async () => {
    seedGame()
    const wrapper = mountChapter()

    expect(wrapper.find('#chapter-pre-journal-section').exists()).toBe(false)

    await wrapper.find('#chapter-book-section button').trigger('click')
    await flushPromises()
    expect(API.generateChapterBook).toHaveBeenCalledWith('g1')

    await wrapper.find('.book-reveal-stub').trigger('click')
    expect(wrapper.find('#chapter-pre-journal-section').exists()).toBe(true)
  })

  it('blocks the pre-roll journal when it is empty', async () => {
    seedGame()
    const wrapper = mountChapter()
    await wrapper.find('#chapter-book-section button').trigger('click')
    await flushPromises()
    await wrapper.find('.book-reveal-stub').trigger('click')

    await wrapper.find('#chapter-pre-journal-section button').trigger('click')
    await flushPromises()

    expect(API.saveJournalEntry).not.toHaveBeenCalled()
    expect(wrapper.find('#chapter-roll-section').exists()).toBe(false)
  })

  it('keeps the roll button disabled until an attribute is selected', async () => {
    seedGame()
    const wrapper = mountChapter()
    await reachRollStep(wrapper)

    const rollBtn = wrapper.find('#chapter-roll-section button.btn-primary')
    expect(rollBtn.element.disabled).toBe(true)

    await wrapper.find('.attr-stub').trigger('click')
    expect(rollBtn.element.disabled).toBe(false)
  })

  it('routes a weak_hit into the support-title step (mirrors chapters.feature)', async () => {
    seedGame()
    const wrapper = mountChapter()
    await reachRollStep(wrapper)
    await rollWithOutcome(wrapper, 'weak_hit')

    expect(wrapper.find('#chapter-support-title-section').exists()).toBe(true)
    expect(wrapper.find('#chapter-post-journal-section').exists()).toBe(false)
  })

  it('routes a hit straight to the post-roll journal (no support title)', async () => {
    seedGame()
    const wrapper = mountChapter()
    await reachRollStep(wrapper)
    await rollWithOutcome(wrapper, 'hit')

    expect(wrapper.find('#chapter-support-title-section').exists()).toBe(false)
    expect(wrapper.find('#chapter-post-journal-section').exists()).toBe(true)
  })

  it('advances to the next chapter only after a non-empty post-roll journal', async () => {
    seedGame()
    const wrapper = mountChapter()
    await reachRollStep(wrapper)
    await rollWithOutcome(wrapper, 'hit')

    // Empty post-journal → the advance endpoint must not be called.
    await wrapper.find('button.btn-lg').trigger('click')
    await flushPromises()
    expect(API.advanceChapter).not.toHaveBeenCalled()

    // With content → advances and resets to the book step of the next chapter.
    API.advanceChapter.mockResolvedValueOnce({
      id: 'g1', current_phase: 'chapter_2', attributes: [], roll_results: [],
    })
    await wrapper.find('#chapter-post-journal-section textarea').setValue('Closing line')
    await wrapper.find('button.btn-lg').trigger('click')
    await flushPromises()

    expect(API.advanceChapter).toHaveBeenCalledWith('g1')
    expect(wrapper.find('#chapter-book-section button').exists()).toBe(true) // back to discover
    expect(wrapper.find('#chapter-pre-journal-section').exists()).toBe(false)
  })
})
