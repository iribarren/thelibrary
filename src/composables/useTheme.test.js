import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTheme } from './useTheme.js'
import { useGameStore } from '@/stores/game.js'
import { THEME_NAMES } from '@/constants/themes.js'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  document.documentElement.className = ''
})

afterEach(() => {
  document.documentElement.className = ''
  vi.restoreAllMocks()
})

// ── currentTheme ──────────────────────────────────────────────────────────────

describe('useTheme — currentTheme', () => {
  it('is null when there is no game', () => {
    expect(useTheme().currentTheme.value).toBeNull()
  })

  it('maps the genre to its theme when no epoch is set', () => {
    const game = useGameStore()
    game.game = { genre: 'Investigación' }
    expect(useTheme().currentTheme.value).toBe('theme-noir')
  })

  it('lets the epoch take priority over the genre', () => {
    const game = useGameStore()
    // 'Investigación' → noir, but 'Medieval' epoch → fantasy wins.
    game.game = { genre: 'Investigación', epoch: 'Medieval' }
    expect(useTheme().currentTheme.value).toBe('theme-fantasy')
  })

  it('is null for unknown genre/epoch values', () => {
    const game = useGameStore()
    game.game = { genre: 'Nonexistent', epoch: 'Nonexistent' }
    expect(useTheme().currentTheme.value).toBeNull()
  })
})

// ── applyTheme ────────────────────────────────────────────────────────────────

describe('useTheme — applyTheme', () => {
  it('adds the theme class to <html>', () => {
    useTheme().applyTheme('theme-noir')
    expect(document.documentElement.classList.contains('theme-noir')).toBe(true)
  })

  it('removes any previously applied theme- class', () => {
    const { applyTheme } = useTheme()
    applyTheme('theme-noir')
    applyTheme('theme-fantasy')
    expect(document.documentElement.classList.contains('theme-noir')).toBe(false)
    expect(document.documentElement.classList.contains('theme-fantasy')).toBe(true)
  })

  it('does not remove unrelated (non theme-) classes', () => {
    document.documentElement.classList.add('dark')
    useTheme().applyTheme('theme-noir')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

// ── applyGameTheme ────────────────────────────────────────────────────────────

describe('useTheme — applyGameTheme', () => {
  it('applies the theme derived from the current game', () => {
    const game = useGameStore()
    game.game = { genre: 'Fantasía' }
    useTheme().applyGameTheme()
    expect(document.documentElement.classList.contains('theme-fantasy')).toBe(true)
  })

  it('does nothing when there is no resolvable theme', () => {
    useTheme().applyGameTheme()
    const themeClasses = Array.from(document.documentElement.classList).filter(c => c.startsWith('theme-'))
    expect(themeClasses).toHaveLength(0)
  })
})

// ── applyRandomTheme ──────────────────────────────────────────────────────────

describe('useTheme — applyRandomTheme', () => {
  it('applies one of the known theme names', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // first theme
    useTheme().applyRandomTheme()
    expect(document.documentElement.classList.contains(THEME_NAMES[0])).toBe(true)
  })
})
