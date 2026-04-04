<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.js'
import { useGameStore } from '@/stores/game.js'
import { useNavigation } from '@/composables/useNavigation.js'
import * as API from '@/api/index.js'
import Modal from '@/components/Modal.vue'
import MessageBar from '@/components/MessageBar.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const gameStore = useGameStore()
const { navigateToPhase } = useNavigation()

const modal         = ref(null) // 'login' | 'register' | 'sessions' | null
const sessions      = ref([])
const sessionsLoading = ref(false)
const sessionsError = ref('')

// Login form
const loginEmail    = ref('')
const loginPassword = ref('')
const loginError    = ref('')
const loginLoading  = ref(false)

// Register form
const regEmail    = ref('')
const regPassword = ref('')
const regConfirm  = ref('')
const regError    = ref('')
const regLoading  = ref(false)

function openLogin()    { modal.value = 'login';    loginError.value = '' }
function openRegister() { modal.value = 'register'; regError.value = '' }
function closeModal()   { modal.value = null }

async function openMySessions() {
  modal.value = 'sessions'
  sessionsLoading.value = true
  sessionsError.value = ''
  try {
    sessions.value = await API.fetchPlayerSessions()
  } catch {
    sessionsError.value = t('auth.error_generic')
  } finally {
    sessionsLoading.value = false
  }
}

async function onLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const result = await API.login(loginEmail.value, loginPassword.value)
    authStore.setAuth(result.token, result.user ?? null)
    authStore.setRefreshToken(result.refresh_token)
    if (!result.user) {
      try { authStore.setAuth(result.token, await API.fetchMe()) } catch { /* non-critical */ }
    }
    closeModal()
  } catch (err) {
    const is401 = err.status === 401 || err.status === 400
    loginError.value = is401 ? t('auth.error_invalid_credentials') : t('auth.error_generic')
  } finally {
    loginLoading.value = false
  }
}

async function onRegister() {
  regError.value = ''
  if (regPassword.value !== regConfirm.value) {
    regError.value = t('auth.error_passwords_mismatch')
    return
  }
  regLoading.value = true
  try {
    const result = await API.register(regEmail.value, regPassword.value, regConfirm.value)
    authStore.setAuth(result.token, result.user ?? null)
    authStore.setRefreshToken(result.refresh_token)
    if (!result.user) {
      try { authStore.setAuth(result.token, await API.fetchMe()) } catch { /* non-critical */ }
    }
    closeModal()
  } catch (err) {
    const details = err.body?.error?.details
    if (details) {
      regError.value = Object.values(details).flat().join(' ')
    } else {
      regError.value = t('auth.error_generic')
    }
  } finally {
    regLoading.value = false
  }
}

function logout() {
  authStore.clearAuth()
}

async function resumeSession(sessionId) {
  try {
    const game = await API.fetchGame(sessionId)
    gameStore.setGame(game)
    closeModal()
    navigateToPhase(game.current_phase)
  } catch {
    sessionsError.value = t('auth.error_generic')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div id="auth-section">
    <!-- Authenticated -->
    <div v-if="authStore.isAuthenticated" class="auth-section auth-section--logged-in">
      <span class="auth-user-info">
        {{ t('auth.logged_in_as') }} {{ authStore.user?.displayName || authStore.user?.email }}
      </span>
      <button class="btn btn-secondary btn-sm auth-btn" @click="openMySessions">
        {{ t('auth.my_sessions') }}
      </button>
      <button class="btn btn-ghost btn-sm auth-btn" @click="logout">
        {{ t('auth.logout') }}
      </button>
    </div>

    <!-- Guest -->
    <div v-else class="auth-section auth-section--guest">
      <button class="btn btn-secondary btn-sm auth-btn" @click="openLogin">{{ t('auth.login') }}</button>
      <button class="btn btn-ghost btn-sm auth-btn" @click="openRegister">{{ t('auth.register') }}</button>
    </div>

    <!-- Login modal -->
    <Modal :open="modal === 'login'" :title="t('auth.login_title')" @close="closeModal">
      <form class="auth-form" @submit.prevent="onLogin">
        <h3 class="auth-form__title">{{ t('auth.login_title') }}</h3>
        <div class="auth-form__field">
          <label class="auth-form__label" for="auth-login-email">{{ t('auth.email') }}</label>
          <input id="auth-login-email" v-model="loginEmail" class="auth-form__input" type="email" required autocomplete="email" />
        </div>
        <div class="auth-form__field">
          <label class="auth-form__label" for="auth-login-password">{{ t('auth.password') }}</label>
          <input id="auth-login-password" v-model="loginPassword" class="auth-form__input" type="password" required autocomplete="current-password" />
        </div>
        <MessageBar :message="loginError" />
        <button class="btn btn-primary btn-full" type="submit" :disabled="loginLoading">
          <span class="btn-text">{{ t('auth.submit_login') }}</span>
          <span v-if="loginLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
      </form>
    </Modal>

    <!-- Register modal -->
    <Modal :open="modal === 'register'" :title="t('auth.register_title')" @close="closeModal">
      <form class="auth-form" @submit.prevent="onRegister">
        <h3 class="auth-form__title">{{ t('auth.register_title') }}</h3>
        <div class="auth-form__field">
          <label class="auth-form__label" for="auth-reg-email">{{ t('auth.email') }}</label>
          <input id="auth-reg-email" v-model="regEmail" class="auth-form__input" type="email" required autocomplete="email" />
        </div>
        <div class="auth-form__field">
          <label class="auth-form__label" for="auth-reg-password">{{ t('auth.password') }}</label>
          <input id="auth-reg-password" v-model="regPassword" class="auth-form__input" type="password" required autocomplete="new-password" />
        </div>
        <div class="auth-form__field">
          <label class="auth-form__label" for="auth-reg-confirm">{{ t('auth.password_confirm') }}</label>
          <input id="auth-reg-confirm" v-model="regConfirm" class="auth-form__input" type="password" required autocomplete="new-password" />
        </div>
        <MessageBar :message="regError" />
        <button class="btn btn-primary btn-full" type="submit" :disabled="regLoading">
          <span class="btn-text">{{ t('auth.submit_register') }}</span>
          <span v-if="regLoading" class="btn-spinner"><span class="spinner" /></span>
        </button>
      </form>
    </Modal>

    <!-- My Sessions modal -->
    <Modal :open="modal === 'sessions'" :title="t('auth.my_sessions_title')" @close="closeModal">
      <div class="auth-sessions-view">
        <h2 class="auth-sessions-title">{{ t('auth.my_sessions_title') }}</h2>
        <p v-if="sessionsLoading" class="auth-sessions-status">{{ t('auth.loading_sessions') }}</p>
        <MessageBar :message="sessionsError" />
        <p v-if="!sessionsLoading && !sessions.length && !sessionsError" class="auth-sessions-empty">
          {{ t('auth.no_sessions') }}
        </p>
        <div class="session-list">
          <div v-for="session in sessions" :key="session.id" class="session-card">
            <div class="session-card__title">{{ session.character_name || '—' }}</div>
            <div class="session-card__meta">
              <span>{{ [session.genre, session.epoch].filter(Boolean).join(' · ') || '—' }}</span>
              <span class="session-card__phase">{{ t('auth.session_phase') }}: {{ session.current_phase || '—' }}</span>
              <span v-if="session.created_at">{{ t('auth.session_created') }}: {{ formatDate(session.created_at) }}</span>
            </div>
            <div class="session-card__actions">
              <button class="btn btn-primary btn-sm" @click="resumeSession(session.id)">
                {{ t('auth.resume') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
