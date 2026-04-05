import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'

const STORAGE_KEY_GAME_ID    = 'biblioteca_game_id'
const STORAGE_KEY_GAME_STATE = 'biblioteca_game_state'

// Minimal game fixture used across several tests
function makeGame(overrides = {}) {
  return {
    id: 42,
    current_phase: 'chapter_1',
    overcome_score: 0,
    support_used: false,
    attributes: [
      { type: 'body',   base_value: 2, background: 1, support: 0 },
      { type: 'mind',   base_value: 1, background: 0, support: 1 },
      { type: 'social', base_value: 3, background: 0, support: 0 },
    ],
    roll_results: [],
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

// ── setGame ────────────────────────────────────────────────────────────────

describe('setGame', () => {
  it('updates game and gameId from the provided game state', () => {
    const store = useGameStore()
    const game  = makeGame()
    store.setGame(game)

    expect(store.game).toEqual(game)
    expect(store.gameId).toBe(42)
  })

  it('persists gameId to localStorage', () => {
    const store = useGameStore()
    store.setGame(makeGame({ id: 7 }))

    expect(localStorage.getItem(STORAGE_KEY_GAME_ID)).toBe('7')
  })

  it('persists serialised game state to localStorage', () => {
    const store = useGameStore()
    const game  = makeGame({ id: 7 })
    store.setGame(game)

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_GAME_STATE))).toEqual(game)
  })

  it('sets gameId to null when called with null', () => {
    const store = useGameStore()
    store.setGame(makeGame())
    store.setGame(null)

    expect(store.gameId).toBeNull()
    expect(store.game).toBeNull()
  })

  it('removes both localStorage keys when called with null', () => {
    const store = useGameStore()
    store.setGame(makeGame())
    store.setGame(null)

    expect(localStorage.getItem(STORAGE_KEY_GAME_ID)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY_GAME_STATE)).toBeNull()
  })
})

// ── resetState ────────────────────────────────────────────────────────────

describe('resetState', () => {
  it('clears game, gameId, currentBook, and rollResult', () => {
    const store = useGameStore()
    store.setGame(makeGame())
    store.setCurrentBook({ title: 'Dune' })
    store.setGameWithRoll(makeGame(), { value: 5 })

    store.resetState()

    expect(store.game).toBeNull()
    expect(store.gameId).toBeNull()
    expect(store.currentBook).toBeNull()
    expect(store.rollResult).toBeNull()
  })

  it('removes the gameId localStorage key after reset', () => {
    const store = useGameStore()
    store.setGame(makeGame())
    store.resetState()

    expect(localStorage.getItem(STORAGE_KEY_GAME_ID)).toBeNull()
  })

  it('keeps oracleTables intact after reset', () => {
    const store  = useGameStore()
    const tables = { events: ['Storm', 'Journey'] }
    store.setOracleTables(tables)
    store.setGame(makeGame())
    store.resetState()

    expect(store.oracleTables).toEqual(tables)
  })
})

// ── usedChapterAttributes ────────────────────────────────────────────────

describe('usedChapterAttributes', () => {
  it('returns an empty Set when there are no roll results', () => {
    const store = useGameStore()
    store.setGame(makeGame({ roll_results: [] }))

    expect(store.usedChapterAttributes.size).toBe(0)
  })

  it('returns an empty Set when game is null', () => {
    const store = useGameStore()
    // game stays null

    expect(store.usedChapterAttributes.size).toBe(0)
  })

  it('includes attribute_type for rolls whose phase starts with chapter_', () => {
    const store = useGameStore()
    store.setGame(makeGame({
      roll_results: [
        { phase: 'chapter_1', attribute_type: 'body' },
        { phase: 'chapter_2', attribute_type: 'mind' },
      ],
    }))

    expect(store.usedChapterAttributes).toEqual(new Set(['body', 'mind']))
  })

  it('excludes rolls from non-chapter phases', () => {
    const store = useGameStore()
    store.setGame(makeGame({
      roll_results: [
        { phase: 'intro',            attribute_type: 'body' },
        { phase: 'epilogue_action_1', attribute_type: 'social' },
        { phase: 'chapter_1',        attribute_type: 'mind' },
      ],
    }))

    expect(store.usedChapterAttributes).toEqual(new Set(['mind']))
  })

  it('deduplicates the same attribute used in multiple chapter rolls', () => {
    const store = useGameStore()
    store.setGame(makeGame({
      roll_results: [
        { phase: 'chapter_1', attribute_type: 'body' },
        { phase: 'chapter_2', attribute_type: 'body' },
      ],
    }))

    expect(store.usedChapterAttributes.size).toBe(1)
    expect(store.usedChapterAttributes.has('body')).toBe(true)
  })
})

// ── usedEpilogueAttributes ───────────────────────────────────────────────

describe('usedEpilogueAttributes', () => {
  it('returns an empty Set when there are no roll results', () => {
    const store = useGameStore()
    store.setGame(makeGame({ roll_results: [] }))

    expect(store.usedEpilogueAttributes.size).toBe(0)
  })

  it('includes attribute_type for rolls whose phase starts with epilogue_action', () => {
    const store = useGameStore()
    store.setGame(makeGame({
      roll_results: [
        { phase: 'epilogue_action_1', attribute_type: 'social' },
        { phase: 'epilogue_action_2', attribute_type: 'body' },
      ],
    }))

    expect(store.usedEpilogueAttributes).toEqual(new Set(['social', 'body']))
  })

  it('excludes chapter rolls', () => {
    const store = useGameStore()
    store.setGame(makeGame({
      roll_results: [
        { phase: 'chapter_1',         attribute_type: 'mind' },
        { phase: 'epilogue_action_1', attribute_type: 'social' },
      ],
    }))

    expect(store.usedEpilogueAttributes).toEqual(new Set(['social']))
  })
})

// ── getAttributeByType ───────────────────────────────────────────────────

describe('getAttributeByType', () => {
  it('returns the matching attribute object', () => {
    const store = useGameStore()
    store.setGame(makeGame())

    const attr = store.getAttributeByType('mind')
    expect(attr).toEqual({ type: 'mind', base_value: 1, background: 0, support: 1 })
  })

  it('returns null for an unknown type', () => {
    const store = useGameStore()
    store.setGame(makeGame())

    expect(store.getAttributeByType('luck')).toBeNull()
  })

  it('returns null when game is null', () => {
    const store = useGameStore()
    // game stays null

    expect(store.getAttributeByType('body')).toBeNull()
  })
})

// ── supportUsed ──────────────────────────────────────────────────────────

describe('supportUsed', () => {
  it('returns false when support_used is false on the game', () => {
    const store = useGameStore()
    store.setGame(makeGame({ support_used: false }))

    expect(store.supportUsed).toBe(false)
  })

  it('returns true when support_used is true on the game', () => {
    const store = useGameStore()
    store.setGame(makeGame({ support_used: true }))

    expect(store.supportUsed).toBe(true)
  })

  it('returns false when game is null', () => {
    const store = useGameStore()
    // game stays null

    expect(store.supportUsed).toBe(false)
  })
})

// ── setOracleTablesLoading ───────────────────────────────────────────────────

describe('setOracleTablesLoading', () => {
  it('has an initial value of false', () => {
    const store = useGameStore()

    expect(store.oracleTablesLoading).toBe(false)
  })

  it('sets oracleTablesLoading to true', () => {
    const store = useGameStore()
    store.setOracleTablesLoading(true)

    expect(store.oracleTablesLoading).toBe(true)
  })

  it('sets oracleTablesLoading back to false', () => {
    const store = useGameStore()
    store.setOracleTablesLoading(true)
    store.setOracleTablesLoading(false)

    expect(store.oracleTablesLoading).toBe(false)
  })

  it('is not cleared by resetState', () => {
    const store = useGameStore()
    store.setOracleTablesLoading(true)
    store.setGame(makeGame())
    store.resetState()

    expect(store.oracleTablesLoading).toBe(true)
  })
})

// ── getAttributeTotal ────────────────────────────────────────────────────

describe('getAttributeTotal', () => {
  it('returns base_value + background + support for a known attribute', () => {
    const store = useGameStore()
    // body: base_value=2, background=1, support=0  → total=3
    store.setGame(makeGame())

    expect(store.getAttributeTotal('body')).toBe(3)
  })

  it('includes all three fields in the sum', () => {
    const store = useGameStore()
    // mind: base_value=1, background=0, support=1  → total=2
    store.setGame(makeGame())

    expect(store.getAttributeTotal('mind')).toBe(2)
  })

  it('returns 0 for an unknown attribute type', () => {
    const store = useGameStore()
    store.setGame(makeGame())

    expect(store.getAttributeTotal('luck')).toBe(0)
  })

  it('returns 0 when game is null', () => {
    const store = useGameStore()

    expect(store.getAttributeTotal('body')).toBe(0)
  })

  it('treats missing attribute fields as 0', () => {
    const store = useGameStore()
    store.setGame(makeGame({
      attributes: [{ type: 'body', base_value: 4 }], // background and support absent
    }))

    expect(store.getAttributeTotal('body')).toBe(4)
  })
})
