import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY_GAME_ID    = 'biblioteca_game_id'
const STORAGE_KEY_GAME_STATE = 'biblioteca_game_state'

export const useGameStore = defineStore('game', () => {
  // ── State ──────────────────────────────────────────────────
  const gameId            = ref(null)
  const game              = ref(null)
  const oracleTables      = ref(null)
  const oracleTablesLoading = ref(false)
  const currentBook       = ref(null)
  const rollResult        = ref(null)

  // ── Getters ────────────────────────────────────────────────
  const currentPhase = computed(() => game.value?.current_phase ?? null)
  const attributes   = computed(() => game.value?.attributes ?? [])
  const overcomeScore = computed(() => game.value?.overcome_score ?? 0)
  const supportUsed  = computed(() => game.value?.support_used ?? false)

  const usedChapterAttributes = computed(() => {
    const used = new Set()
    for (const r of game.value?.roll_results ?? []) {
      if (r.phase?.startsWith('chapter_')) used.add(r.attribute_type)
    }
    return used
  })

  const usedEpilogueAttributes = computed(() => {
    const used = new Set()
    for (const r of game.value?.roll_results ?? []) {
      if (r.phase?.startsWith('epilogue_action')) used.add(r.attribute_type)
    }
    return used
  })

  const currentChapterNumber = computed(() => {
    const match = currentPhase.value?.match(/^chapter_(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  })

  const currentEpilogueActionNumber = computed(() => {
    const match = currentPhase.value?.match(/^epilogue_action_(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  })

  function getAttributeByType(type) {
    return game.value?.attributes?.find(a => a.type === type) ?? null
  }

  function getAttributeTotal(type) {
    const attr = getAttributeByType(type)
    if (!attr) return 0
    return (attr.base_value ?? 0) + (attr.background ?? 0) + (attr.support ?? 0)
  }

  // ── Actions ────────────────────────────────────────────────
  function setGame(gameState) {
    game.value   = gameState
    gameId.value = gameState?.id ?? null
    _persistGameId(gameId.value)
    _persistGameState(gameState)
  }

  function setGameWithRoll(newGame, newRollResult = null) {
    game.value       = newGame
    gameId.value     = newGame?.id ?? null
    rollResult.value = newRollResult
    _persistGameId(gameId.value)
    _persistGameState(newGame)
  }

  function setOracleTables(tables) {
    oracleTables.value = tables
  }

  function setOracleTablesLoading(val) {
    oracleTablesLoading.value = val
  }

  function setCurrentBook(book) {
    currentBook.value = book
  }

  function clearCurrentBook() {
    currentBook.value = null
  }

  function clearRollResult() {
    rollResult.value = null
  }

  function resetState() {
    game.value       = null
    gameId.value     = null
    currentBook.value = null
    rollResult.value  = null
    // oracleTables kept — they don't change between games
    _persistGameId(null)
  }

  // ── Private helpers ────────────────────────────────────────
  function _persistGameId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEY_GAME_ID, id)
    } else {
      localStorage.removeItem(STORAGE_KEY_GAME_ID)
      localStorage.removeItem(STORAGE_KEY_GAME_STATE)
    }
  }

  function _persistGameState(gameState) {
    if (gameState) {
      try { localStorage.setItem(STORAGE_KEY_GAME_STATE, JSON.stringify(gameState)) } catch { /* quota */ }
    }
  }

  return {
    // State
    gameId, game, oracleTables, oracleTablesLoading, currentBook, rollResult,
    // Getters
    currentPhase, attributes, overcomeScore, supportUsed,
    usedChapterAttributes, usedEpilogueAttributes,
    currentChapterNumber, currentEpilogueActionNumber,
    getAttributeByType, getAttributeTotal,
    // Actions
    setGame, setGameWithRoll, setOracleTables, setOracleTablesLoading, setCurrentBook,
    clearCurrentBook, clearRollResult, resetState,
  }
})
