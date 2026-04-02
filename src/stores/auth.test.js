import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

const STORAGE_KEY_REFRESH_TOKEN = 'biblioteca_refresh_token'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

// ── Initial state ─────────────────────────────────────────────────────────

describe('initial state', () => {
  it('token is null by default', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
  })

  it('user is null by default', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
  })

  it('isAuthenticated is false by default', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })
})

// ── setAuth ───────────────────────────────────────────────────────────────

describe('setAuth', () => {
  it('sets the token', () => {
    const store = useAuthStore()
    store.setAuth('jwt-abc', { id: 1, email: 'a@b.com' })

    expect(store.token).toBe('jwt-abc')
  })

  it('sets the user', () => {
    const store = useAuthStore()
    const user = { id: 1, email: 'a@b.com' }
    store.setAuth('jwt-abc', user)

    expect(store.user).toEqual(user)
  })

  it('makes isAuthenticated true', () => {
    const store = useAuthStore()
    store.setAuth('jwt-abc', { id: 1 })

    expect(store.isAuthenticated).toBe(true)
  })

  it('updates the token on a second call', () => {
    const store = useAuthStore()
    store.setAuth('token-1', { id: 1 })
    store.setAuth('token-2', { id: 1 })

    expect(store.token).toBe('token-2')
  })

  it('does not overwrite the user when called with null as newUser', () => {
    // setAuth only updates user when newUser !== null (as per implementation)
    const store = useAuthStore()
    const user = { id: 1, email: 'a@b.com' }
    store.setAuth('token-1', user)
    store.setAuth('token-2', null)

    expect(store.user).toEqual(user)
  })
})

// ── clearAuth ─────────────────────────────────────────────────────────────

describe('clearAuth', () => {
  it('sets token to null', () => {
    const store = useAuthStore()
    store.setAuth('jwt-xyz', { id: 1 })
    store.clearAuth()

    expect(store.token).toBeNull()
  })

  it('sets user to null', () => {
    const store = useAuthStore()
    store.setAuth('jwt-xyz', { id: 1 })
    store.clearAuth()

    expect(store.user).toBeNull()
  })

  it('makes isAuthenticated false', () => {
    const store = useAuthStore()
    store.setAuth('jwt-xyz', { id: 1 })
    store.clearAuth()

    expect(store.isAuthenticated).toBe(false)
  })

  it('removes biblioteca_refresh_token from localStorage', () => {
    const store = useAuthStore()
    localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, 'rt-token')
    store.clearAuth()

    expect(localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)).toBeNull()
  })

  it('is safe to call when already in a cleared state', () => {
    const store = useAuthStore()
    expect(() => store.clearAuth()).not.toThrow()
    expect(store.isAuthenticated).toBe(false)
  })
})

// ── setRefreshToken / getRefreshToken ─────────────────────────────────────

describe('setRefreshToken and getRefreshToken', () => {
  it('persists the refresh token to localStorage', () => {
    const store = useAuthStore()
    store.setRefreshToken('rt-abc123')

    expect(localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)).toBe('rt-abc123')
  })

  it('retrieves the stored refresh token', () => {
    const store = useAuthStore()
    store.setRefreshToken('rt-abc123')

    expect(store.getRefreshToken()).toBe('rt-abc123')
  })

  it('returns null when no refresh token has been stored', () => {
    const store = useAuthStore()

    expect(store.getRefreshToken()).toBeNull()
  })

  it('overwrites a previously stored refresh token', () => {
    const store = useAuthStore()
    store.setRefreshToken('old-token')
    store.setRefreshToken('new-token')

    expect(store.getRefreshToken()).toBe('new-token')
  })

  it('returns null after clearAuth removes the stored token', () => {
    const store = useAuthStore()
    store.setRefreshToken('rt-abc123')
    store.clearAuth()

    expect(store.getRefreshToken()).toBeNull()
  })
})
