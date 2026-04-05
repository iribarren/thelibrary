import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game.js'
import PrologueView from './PrologueView.vue'

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/api/index.js', () => ({
  fetchOracleTables: vi.fn(() => Promise.resolve({ genre: [], epoch: [] })),
  fetchRandomSetting: vi.fn(),
  saveJournalEntry: vi.fn(),
  submitPrologue: vi.fn(),
}))

vi.mock('@/composables/useNavigation.js', () => ({
  useNavigation: () => ({ navigateToPhase: vi.fn() }),
}))

// ── i18n fixture ─────────────────────────────────────────────────────────────

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      prologue: {
        title: 'Prologue',
        subtitle: 'Begin your story',
        setting_title: 'Setting',
        loading_oracles: 'Loading options…',
        genre_label: 'Genre',
        genre_placeholder: 'Select genre',
        epoch_label: 'Epoch',
        epoch_placeholder: 'Select epoch',
        or: 'or',
        random: 'Random',
        character_title: 'Character',
        name_label: 'Name',
        name_placeholder: 'Enter name',
        desc_label: 'Description',
        desc_placeholder: 'Enter description',
        first_page_title: 'First Page',
        first_page_help: 'Write your first entry',
        first_page_placeholder: 'Write here…',
        start_adventure: 'Start',
      },
      errors: {
        choose_genre: 'Choose a genre',
        choose_epoch: 'Choose an epoch',
        need_name: 'Enter a name',
        need_description: 'Enter a description',
        need_journal: 'Write a journal entry',
        load_oracle: 'Failed to load options',
      },
    },
  },
})

// ── Mount helper ─────────────────────────────────────────────────────────────

function mountPrologue() {
  return mount(PrologueView, {
    global: {
      plugins: [i18n],
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
        MessageBar: { template: '<div />' },
        AppSidebar: true,
      },
    },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('PrologueView — oracle loading indicator', () => {
  it('does not show the loading message when oracleTablesLoading is false', () => {
    const gameStore = useGameStore()
    gameStore.setOracleTablesLoading(false)
    // Provide tables so onMounted skips the API call
    gameStore.setOracleTables({ genre: [], epoch: [] })

    const wrapper = mountPrologue()

    expect(wrapper.text()).not.toContain('Loading options…')
  })

  it('shows the loading message when oracleTablesLoading is true', () => {
    const gameStore = useGameStore()
    gameStore.setOracleTablesLoading(true)
    gameStore.setOracleTables({ genre: [], epoch: [] })

    const wrapper = mountPrologue()

    expect(wrapper.text()).toContain('Loading options…')
  })
})

describe('PrologueView — selects disabled state', () => {
  it('genre and epoch selects are not disabled when oracleTablesLoading is false', () => {
    const gameStore = useGameStore()
    gameStore.setOracleTablesLoading(false)
    gameStore.setOracleTables({ genre: [], epoch: [] })

    const wrapper = mountPrologue()

    expect(wrapper.find('#select-genre').element.disabled).toBe(false)
    expect(wrapper.find('#select-epoch').element.disabled).toBe(false)
  })

  it('genre and epoch selects are disabled when oracleTablesLoading is true', () => {
    const gameStore = useGameStore()
    gameStore.setOracleTablesLoading(true)
    gameStore.setOracleTables({ genre: [], epoch: [] })

    const wrapper = mountPrologue()

    expect(wrapper.find('#select-genre').element.disabled).toBe(true)
    expect(wrapper.find('#select-epoch').element.disabled).toBe(true)
  })
})
