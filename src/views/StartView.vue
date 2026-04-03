<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useGameStore } from '@/stores/game.js'
import { useNavigation } from '@/composables/useNavigation.js'
import * as API from '@/api/index.js'
import AuthSection from '@/features/auth/AuthSection.vue'
import MessageBar from '@/components/MessageBar.vue'
import { setLocale, getCurrentLocale } from '@/i18n/index.js'
import { useTheme } from '@/composables/useTheme.js'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()
const { navigateToPhase } = useNavigation()
const { applyRandomTheme, currentTheme } = useTheme()

const newGameLoading     = ref(false)
const continueLoading    = ref(false)
const loadGameLoading    = ref(null) // stores the game ID being loaded
const startError         = ref('')
const games              = ref([])
const gamesLoaded        = ref(false)

onMounted(async () => {
  if (!currentTheme.value) applyRandomTheme()
  try {
    games.value = await API.fetchGames()
  } catch { /* non-critical */ }
  gamesLoaded.value = true
})

async function onNewGame() {
  startError.value = ''
  newGameLoading.value = true
  try {
    const game = await API.createGame('aventura_rapida')
    gameStore.setGame(game)
    navigateToPhase(game.current_phase)
  } catch (err) {
    startError.value = t('errors.create_game', { message: err.message })
  } finally {
    newGameLoading.value = false
  }
}

async function onContinueGame() {
  startError.value = ''
  continueLoading.value = true
  const savedId = localStorage.getItem('biblioteca_game_id')
  if (!savedId) { continueLoading.value = false; return }
  try {
    const game = await API.fetchGame(savedId)
    gameStore.setGame(game)
    navigateToPhase(game.current_phase)
  } catch (err) {
    gameStore.resetState()
    startError.value = t('errors.recover_game', { message: err.message })
  } finally {
    continueLoading.value = false
  }
}

async function loadGame(gameId) {
  startError.value = ''
  loadGameLoading.value = gameId
  try {
    const game = await API.fetchGame(gameId)
    gameStore.setGame(game)
    navigateToPhase(game.current_phase)
  } catch (err) {
    startError.value = t('errors.load_game', { message: err.message })
  } finally {
    loadGameLoading.value = null
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function onLocaleChange(e) {
  setLocale(e.target.value)
}
</script>

<template>
  <div id="screen-start" class="screen-full active">
    <div class="start-content">
      <!-- App header -->
      <header class="start-header">
        <h1 id="start-title" class="start-title">{{ t('app.title') }}</h1>
        <p id="start-subtitle" class="start-subtitle">{{ t('app.subtitle') }}</p>
      </header>

      <p id="start-intro" class="start-intro">{{ t('start.intro') }}</p>

      <MessageBar :message="startError" />

      <!-- Action buttons -->
      <div class="start-actions">
        <button
          id="btn-new-game"
          class="btn btn-primary btn-lg"
          :disabled="newGameLoading || !authStore.isAuthenticated"
          :title="!authStore.isAuthenticated ? t('start.login_required') : undefined"
          @click="onNewGame"
        >
          <span class="btn-text">✦ {{ t('start.new_game') }}</span>
          <span v-if="newGameLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>

        <button
          v-if="gameStore.hasSavedGame"
          id="btn-continue-game"
          class="btn btn-secondary btn-lg"
          :disabled="continueLoading || !authStore.isAuthenticated"
          :title="!authStore.isAuthenticated ? t('start.login_required') : undefined"
          @click="onContinueGame"
        >
          <span class="btn-text">↩ {{ t('start.continue_game') }}</span>
          <span v-if="continueLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
      </div>

      <p v-if="!authStore.isAuthenticated" class="start-auth-hint">{{ t('start.login_required') }}</p>

      <!-- Auth section -->
      <AuthSection />

      <!-- Saved games list -->
      <div v-if="gamesLoaded && games.length" id="game-list-section" class="game-list-section">
        <h3 id="game-list-title" class="section-title">{{ t('start.saved_games') }}</h3>
        <div id="game-list" class="game-list">
          <div
            v-for="g in games"
            :key="g.id"
            class="game-list-item"
            role="button"
            tabindex="0"
            :aria-label="t('start.load_game_aria', { name: g.character_name || t('start.no_name') })"
            @click="loadGame(g.id)"
            @keydown.enter="loadGame(g.id)"
          >
            <span class="game-list-item-icon">{{ g.current_phase === 'completed' ? '📕' : '📖' }}</span>
            <div class="game-list-item-info">
              <div class="game-list-item-name">{{ g.character_name || t('start.no_name') }}</div>
              <div class="game-list-item-meta">
                <span>{{ [g.genre, g.epoch].filter(Boolean).join(' · ') || '—' }}</span>
                <span v-if="g.updated_at"> · {{ formatDate(g.updated_at) }}</span>
              </div>
            </div>
            <span class="game-list-item-phase">{{ g.phase_label || g.current_phase || '—' }}</span>
            <span v-if="loadGameLoading === g.id" class="spinner" style="margin-left:auto;" />
          </div>
        </div>
      </div>

      <!-- Locale switcher -->
      <div class="start-footer">
        <select class="form-control form-control-sm" style="max-width:120px;" @change="onLocaleChange">
          <option value="es" :selected="$i18n.locale === 'es'">Español</option>
          <option value="en" :selected="$i18n.locale === 'en'">English</option>
        </select>
      </div>
    </div>
  </div>
</template>
