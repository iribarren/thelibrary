<script setup>
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game.js'
import { useAuthStore } from '@/stores/auth.js'
import * as API from '@/api/index.js'
import { useTheme } from '@/composables/useTheme.js'
import { useNavigation } from '@/composables/useNavigation.js'

const { locale } = useI18n()
const router     = useRouter()
const gameStore  = useGameStore()
const authStore  = useAuthStore()
const { applyGameTheme } = useTheme()
const { navigateToPhase } = useNavigation()

watch(
  () => [gameStore.game?.genre, gameStore.game?.epoch],
  () => { applyGameTheme() }
)

onMounted(async () => {
  applyGameTheme()

  // Silent token refresh on page load
  const storedRefresh = authStore.getRefreshToken()
  if (storedRefresh) {
    try {
      const data = await API.refreshToken(storedRefresh)
      authStore.setAuth(data.token, null)
      authStore.setRefreshToken(data.refresh_token)
      try { authStore.setAuth(data.token, await API.fetchMe()) } catch { /* non-critical */ }
    } catch {
      authStore.clearAuth()
    }
  }

  // Auto-resume: if localStorage has a game ID, fetch from API and redirect
  const savedId = localStorage.getItem('biblioteca_game_id')
  if (savedId && authStore.isAuthenticated) {
    try {
      const game = await API.fetchGame(savedId)
      if (game.current_phase !== 'completed') {
        gameStore.setGame(game)
        navigateToPhase(game.current_phase)
      } else {
        gameStore.resetState()
      }
    } catch {
      // Stale or inaccessible game — clear and show start screen
      gameStore.resetState()
    }
  }

  // Pre-load oracle tables in background
  try {
    if (!gameStore.oracleTables) {
      gameStore.setOracleTables(await API.fetchOracleTables())
    }
  } catch { /* retried when prologue loads */ }

  document.documentElement.lang = locale.value
})
</script>

<template>
  <router-view />
</template>
