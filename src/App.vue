<script setup>
import { onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore } from '@/stores/game.js'
import { useAuthStore } from '@/stores/auth.js'
import * as API from '@/api/index.js'
import { useTheme } from '@/composables/useTheme.js'

const { locale } = useI18n()
const gameStore  = useGameStore()
const authStore  = useAuthStore()
const { applyGameTheme } = useTheme()

watch(
  () => [gameStore.game?.genre, gameStore.game?.epoch],
  () => { applyGameTheme() }
)

onMounted(async () => {
  // Restore persisted game state from localStorage
  gameStore.hydrateFromStorage()
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
