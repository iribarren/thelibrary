/**
 * api.js — La Biblioteca
 * API client module. All fetch calls to the Symfony backend.
 * All functions return parsed JSON or throw an ApiError.
 */

import { getAuthToken, getRefreshToken, setAuth, setRefreshToken, clearAuth } from './state.js';

const BASE_URL = 'http://localhost:8080';

// ============================================================
// Error class
// ============================================================

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ============================================================
// Core fetch helper
// ============================================================

/**
 * Core fetch helper.
 * @param {string} method
 * @param {string} path
 * @param {object|null} body
 * @param {boolean} isRetry  — internal flag to prevent infinite refresh loops
 */
async function request(method, path, body = null, isRetry = false) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Inject Bearer token if one is present in state
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch (networkError) {
    throw new ApiError(
      'No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.',
      0,
      null
    );
  }

  let responseBody;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  } else {
    responseBody = await response.text();
  }

  // Handle 401: attempt a silent token refresh once, then retry the original request
  if (response.status === 401 && !isRetry) {
    const storedRefreshToken = getRefreshToken();
    if (storedRefreshToken) {
      try {
        const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setAuth(refreshData.token, null);
          setRefreshToken(refreshData.refresh_token);
          // Retry original request with the new token
          return request(method, path, body, true);
        }
      } catch {
        // Refresh network error — fall through and throw original 401
      }
      // Refresh failed: clear auth so the UI shows the login prompt
      clearAuth();
    }
  }

  if (!response.ok) {
    const message =
      (responseBody && responseBody.message) ||
      (responseBody && responseBody.error) ||
      `Error del servidor (${response.status})`;
    throw new ApiError(message, response.status, responseBody);
  }

  return responseBody;
}

const get  = (path)        => request('GET',  path);
const post = (path, body)  => request('POST', path, body);

// ============================================================
// Oracle endpoints
// ============================================================

/**
 * Returns all oracle tables.
 * @returns {{ genre: Array, epoch: Array, color: Array, binding: Array, smell: Array, interior: Array }}
 */
export function fetchOracleTables() {
  return get('/api/oracle/tables');
}

/**
 * Returns a random genre + epoch setting.
 * @returns {{ genre: {value, hint}, epoch: {value, hint} }}
 */
export function fetchRandomSetting() {
  return get('/api/oracle/random-setting');
}

// ============================================================
// Game lifecycle
// ============================================================

/**
 * Lists all game sessions (most recent first).
 * @returns {Array<{ id, character_name, genre, epoch, current_phase, phase_label, created_at, updated_at }>}
 */
export function fetchGames() {
  return get('/api/games');
}

/**
 * Creates a new game. Returns full game state.
 */
export function createGame() {
  return post('/api/game', {});
}

/**
 * Loads an existing game by ID.
 * @param {string} gameId
 */
export function fetchGame(gameId) {
  return get(`/api/game/${gameId}`);
}

/**
 * Submits prologue data (character + setting + journal entry).
 * @param {string} gameId
 * @param {{ character_name: string, character_description: string, genre: string, epoch: string }} data
 */
export function submitPrologue(gameId, data) {
  return post(`/api/game/${gameId}/prologue`, data);
}

// ============================================================
// Chapter endpoints
// ============================================================

/**
 * Generates a book for the current chapter.
 * @param {string} gameId
 * @returns {{ id, phase, color, color_hint, binding, binding_hint, smell, smell_hint, interior }}
 */
export function generateChapterBook(gameId) {
  return post(`/api/game/${gameId}/chapter/book`, {});
}

/**
 * Rolls dice for the current chapter.
 * @param {string} gameId
 * @param {'body'|'mind'|'social'} attribute
 * @returns {{ roll_result: {...}, game: {...} }}
 */
export function rollChapter(gameId, attribute) {
  return post(`/api/game/${gameId}/chapter/roll`, { attribute });
}

// ============================================================
// Epilogue endpoints
// ============================================================

/**
 * Generates the epilogue book.
 * @param {string} gameId
 * @returns book object
 */
export function generateEpilogueBook(gameId) {
  return post(`/api/game/${gameId}/epilogue/book`, {});
}

/**
 * Performs one epilogue action roll.
 * @param {string} gameId
 * @param {'body'|'mind'|'social'} attribute
 * @param {string|null} supportAttribute
 * @returns {{ roll_result: {...}, game: {...} }}
 */
export function rollEpilogueAction(gameId, attribute, supportAttribute = null) {
  return post(`/api/game/${gameId}/epilogue/action`, {
    attribute,
    support_attribute: supportAttribute,
  });
}

/**
 * Performs the epilogue final roll.
 * @param {string} gameId
 * @returns {{ roll_result: {...}, game: {...} }}
 */
export function rollEpilogueFinal(gameId) {
  return post(`/api/game/${gameId}/epilogue/final`, {});
}

// ============================================================
// Journal endpoints
// ============================================================

/**
 * Saves a journal entry for the current phase.
 * @param {string} gameId
 * @param {string} content
 * @param {number|null} bookId
 */
export function saveJournalEntry(gameId, content, bookId = null) {
  return post(`/api/game/${gameId}/journal`, { content, book_id: bookId });
}

/**
 * Loads all journal entries for a game.
 * @param {string} gameId
 * @returns {Array}
 */
export function fetchJournalEntries(gameId) {
  return get(`/api/game/${gameId}/journal`);
}

// ============================================================
// Auth endpoints
// ============================================================

/**
 * Authenticates with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {{ token: string, refresh_token: string }}
 */
export function login(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

/**
 * Registers a new account.
 * @param {string} email
 * @param {string} password
 * @param {string} passwordConfirmation
 * @returns {{ token: string, refresh_token: string, user: { id, email, displayName } }}
 */
export function register(email, password, passwordConfirmation) {
  return request('POST', '/api/auth/register', { email, password, passwordConfirmation });
}

/**
 * Exchanges a refresh token for a new access token.
 * @param {string} token
 * @returns {{ token: string, refresh_token: string }}
 */
export function refreshToken(token) {
  return request('POST', '/api/auth/refresh', { refresh_token: token });
}

/**
 * Returns the currently authenticated user's profile.
 * Requires a valid Bearer token.
 * @returns {{ id, email, displayName, roles }}
 */
export function fetchMe() {
  return get('/api/auth/me');
}

/**
 * Returns the authenticated player's saved game sessions.
 * @returns {Array<{ id, character_name, genre, epoch, current_phase, created_at, updated_at, is_completed }>}
 */
export function fetchPlayerSessions() {
  return get('/api/player/sessions');
}
