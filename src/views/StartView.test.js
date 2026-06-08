import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'
import { useGameStore } from '@/stores/game.js'

// ── Module mocks ─────────────────────────────────────────────────────────────

const { navigateToPhase } = vi.hoisted(() => ({ navigateToPhase: vi.fn() }))
vi.mock('@/composables/useNavigation.js', () => ({ useNavigation: () => ({ navigateToPhase }) }))
vi.mock('@/api/index.js', () => ({ createGame: vi.fn() }))
vi.mock('@/i18n/index.js', () => ({ setLocale: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import * as API from '@/api/index.js'
import StartView from './StartView.vue'

const i18n = createI18n({ legacy: false, locale: 'en', missingWarn: false, fallbackWarn: false, messages: { en: {} } })

function mountStart() {
  return mount(StartView, {
    global: {
      plugins: [i18n],
      stubs: { AuthSection: true, Modal: true, MessageBar: { props: ['message'], template: '<div class="msg">{{ message }}</div>' } },
    },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
  document.documentElement.className = ''
})

describe('StartView — new game auth gate', () => {
  it('disables the new game button when the player is not authenticated', () => {
    const wrapper = mountStart()
    expect(wrapper.find('#btn-new-game').element.disabled).toBe(true)
  })

  it('enables the new game button when the player is authenticated', () => {
    useAuthStore().setAuth('jwt', { id: 1 })
    const wrapper = mountStart()
    expect(wrapper.find('#btn-new-game').element.disabled).toBe(false)
  })
})

describe('StartView — creating a game', () => {
  it('creates a game, stores it and navigates to its current phase', async () => {
    useAuthStore().setAuth('jwt', { id: 1 })
    API.createGame.mockResolvedValueOnce({ id: 'g1', current_phase: 'prologue' })

    const wrapper = mountStart()
    await wrapper.find('#btn-new-game').trigger('click')
    await flushPromises()

    expect(API.createGame).toHaveBeenCalledWith('aventura_rapida')
    expect(useGameStore().gameId).toBe('g1')
    expect(navigateToPhase).toHaveBeenCalledWith('prologue')
  })

  it('surfaces an error message when game creation fails', async () => {
    useAuthStore().setAuth('jwt', { id: 1 })
    API.createGame.mockRejectedValueOnce(new Error('boom'))

    const wrapper = mountStart()
    await wrapper.find('#btn-new-game').trigger('click')
    await flushPromises()

    expect(navigateToPhase).not.toHaveBeenCalled()
    expect(wrapper.find('.msg').text().length).toBeGreaterThan(0)
  })
})
