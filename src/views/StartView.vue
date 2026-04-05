<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useGameStore } from '@/stores/game.js'
import { useNavigation } from '@/composables/useNavigation.js'
import * as API from '@/api/index.js'
import AuthSection from '@/features/auth/AuthSection.vue'
import MessageBar from '@/components/MessageBar.vue'
import Modal from '@/components/Modal.vue'
import { setLocale } from '@/i18n/index.js'
import { useTheme } from '@/composables/useTheme.js'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()
const { navigateToPhase } = useNavigation()
const { applyRandomTheme, currentTheme } = useTheme()

const newGameLoading = ref(false)
const startError     = ref('')
const showInfoModal  = ref(false)

if (!currentTheme.value) applyRandomTheme()

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
          :class="{ loading: newGameLoading }"
          :disabled="newGameLoading || !authStore.isAuthenticated"
          :title="!authStore.isAuthenticated ? t('start.login_required') : undefined"
          @click="onNewGame"
        >
          <span class="btn-text">✦ {{ t('start.new_game') }}</span>
          <span v-if="newGameLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
        <button
          class="btn-info"
          :aria-label="t('info_modal.button_aria')"
          :title="t('info_modal.button_aria')"
          @click="showInfoModal = true"
        >ⓘ</button>
      </div>

      <Modal :open="showInfoModal" :title="t('info_modal.title')" @close="showInfoModal = false">
        <div class="info-modal-content">
          <h2 class="info-modal-title">{{ t('info_modal.title') }}</h2>

          <section class="info-modal-section">
            <h3>{{ t('info_modal.premise_heading') }}</h3>
            <p>{{ t('info_modal.premise') }}</p>
          </section>

          <section class="info-modal-section">
            <h3>{{ t('info_modal.phases_heading') }}</h3>

            <h4>{{ t('info_modal.prologue_heading') }}</h4>
            <p>{{ t('info_modal.prologue') }}</p>

            <h4>{{ t('info_modal.chapters_heading') }}</h4>
            <p>{{ t('info_modal.chapters') }}</p>

            <h4>{{ t('info_modal.epilogue_heading') }}</h4>
            <p>{{ t('info_modal.epilogue') }}</p>
          </section>

          <div class="info-modal-pdf">
            <a href="/la-biblioteca.pdf" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
              ↓ {{ t('info_modal.pdf_link') }}
            </a>
          </div>
        </div>
      </Modal>

      <p v-if="!authStore.isAuthenticated" class="start-auth-hint">{{ t('start.login_required') }}</p>

      <!-- Auth section -->
      <AuthSection />

      <!-- Locale switcher + PDF link -->
      <div class="start-footer">
        <select class="form-control form-control-sm" style="max-width:120px;" @change="onLocaleChange">
          <option value="es" :selected="$i18n.locale === 'es'">Español</option>
          <option value="en" :selected="$i18n.locale === 'en'">English</option>
        </select>
        <a href="/la-biblioteca.pdf" target="_blank" rel="noopener" class="start-footer-pdf-link">
          ↓ {{ t('start.rules_pdf') }}
        </a>
      </div>
    </div>
  </div>
</template>
