/**
 * api/index.js — La Biblioteca
 * API client. All fetch calls to the Symfony backend.
 */

import { useAuthStore } from '@/stores/auth.js'

const BASE_URL = 'http://localhost:8080'

// ── Error class ────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name   = 'ApiError'
    this.status = status
    this.body   = body
  }
}

// ── Core fetch helper ──────────────────────────────────────────
async function request(method, path, body = null, isRetry = false) {
  const authStore = useAuthStore()

  const headers = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  }

  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`
  }

  const options = { method, headers }
  if (body !== null) options.body = JSON.stringify(body)

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.',
      0,
      null,
    )
  }

  let responseBody
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try { responseBody = await response.json() } catch { responseBody = null }
  } else {
    responseBody = await response.text()
  }

  // Handle 401: attempt silent token refresh once, then retry
  if (response.status === 401 && !isRetry) {
    const storedRefreshToken = authStore.getRefreshToken()
    if (storedRefreshToken) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body:    JSON.stringify({ refresh_token: storedRefreshToken }),
        })
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          authStore.setAuth(refreshData.token, null)
          authStore.setRefreshToken(refreshData.refresh_token)
          return request(method, path, body, true)
        }
      } catch { /* refresh network error — fall through */ }
      authStore.clearAuth()
    }
  }

  if (!response.ok) {
    const message =
      (responseBody && responseBody.message) ||
      (responseBody && responseBody.error)   ||
      `Error del servidor (${response.status})`
    throw new ApiError(message, response.status, responseBody)
  }

  return responseBody
}

const get  = (path)       => request('GET',  path)
const post = (path, body) => request('POST', path, body)

// ── Oracle ─────────────────────────────────────────────────────
export const fetchOracleTables  = () => get('/api/oracle/tables')
export const fetchRandomSetting = () => get('/api/oracle/random-setting')

// ── Game lifecycle ──────────────────────────────────────────────
export const fetchGames         = () => get('/api/games')
export const createGame         = (gameMode = 'aventura_rapida') => post('/api/game', { game_mode: gameMode })
export const fetchGame          = (gameId) => get(`/api/game/${gameId}`)
export const submitPrologue     = (gameId, data) => post(`/api/game/${gameId}/prologue`, data)

// ── Chapter ────────────────────────────────────────────────────
export const generateChapterBook = (gameId) => post(`/api/game/${gameId}/chapter/book`, {})
export const rollChapter         = (gameId, attribute) => post(`/api/game/${gameId}/chapter/roll`, { attribute })
export const advanceChapter      = (gameId) => post(`/api/game/${gameId}/chapter/advance`, {})

// ── Epilogue ───────────────────────────────────────────────────
export const generateEpilogueBook = (gameId) => post(`/api/game/${gameId}/epilogue/book`, {})
export const rollEpilogueAction   = (gameId, attribute, supportAttribute = null) =>
  post(`/api/game/${gameId}/epilogue/action`, { attribute, support_attribute: supportAttribute })
export const rollEpilogueFinal    = (gameId) => post(`/api/game/${gameId}/epilogue/final`, {})

// ── Journal ────────────────────────────────────────────────────
export const saveJournalEntry   = (gameId, content, bookId = null) =>
  post(`/api/game/${gameId}/journal`, { content, book_id: bookId })
export const fetchJournalEntries = (gameId) => get(`/api/game/${gameId}/journal`)

// ── Auth ───────────────────────────────────────────────────────
export const login    = (email, password) =>
  request('POST', '/api/auth/login', { email, password })
export const register = (email, password, passwordConfirmation) =>
  request('POST', '/api/auth/register', { email, password, passwordConfirmation })
export const refreshToken   = (token) =>
  request('POST', '/api/auth/refresh', { refresh_token: token })
export const fetchMe               = () => get('/api/auth/me')
export const fetchPlayerSessions   = () => get('/api/player/sessions')
