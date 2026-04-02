import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY_REFRESH_TOKEN = 'biblioteca_refresh_token'

export const useAuthStore = defineStore('auth', () => {
  // Access token lives in memory only — never persisted
  const token = ref(null)
  const user  = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  function getRefreshToken() {
    return localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)
  }

  function setAuth(newToken, newUser) {
    token.value = newToken
    if (newUser !== null) user.value = newUser
  }

  function setRefreshToken(newToken) {
    localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, newToken)
  }

  function clearAuth() {
    token.value = null
    user.value  = null
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN)
  }

  return {
    token, user, isAuthenticated,
    getRefreshToken, setAuth, setRefreshToken, clearAuth,
  }
})
