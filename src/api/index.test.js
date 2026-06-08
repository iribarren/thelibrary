import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.js'
import {
  ApiError,
  fetchGames,
  createGame,
  submitPrologue,
  rollChapter,
  advanceEpilogue,
  login,
  register,
} from './index.js'

const BASE = 'http://localhost:8080'

// ── Response factories ────────────────────────────────────────────────────────

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (String(h).toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function textResponse(text, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'text/plain' },
    json: async () => { throw new Error('not json') },
    text: async () => text,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

// ── Headers & request shape ────────────────────────────────────────────────────

describe('request — headers and URL', () => {
  it('calls the backend with the JSON Accept/Content-Type headers and no Authorization when logged out', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ id: '1' }]))

    await fetchGames()

    expect(fetch).toHaveBeenCalledWith(`${BASE}/api/games`, expect.objectContaining({ method: 'GET' }))
    const [, options] = fetch.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['Accept']).toBe('application/json')
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('adds the Bearer Authorization header when a token is present', async () => {
    useAuthStore().setAuth('jwt-123', null)
    fetch.mockResolvedValueOnce(jsonResponse([]))

    await fetchGames()

    const [, options] = fetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer jwt-123')
  })

  it('serializes the body for POST requests', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id: 'g1' }, 201))

    await createGame('aventura_rapida')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/game`)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ game_mode: 'aventura_rapida' })
  })
})

// ── Response parsing ────────────────────────────────────────────────────────────

describe('request — response parsing', () => {
  it('parses JSON responses', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ hello: 'world' }))
    await expect(fetchGames()).resolves.toEqual({ hello: 'world' })
  })

  it('returns text for non-JSON responses', async () => {
    fetch.mockResolvedValueOnce(textResponse('plain text'))
    await expect(fetchGames()).resolves.toBe('plain text')
  })
})

// ── Error handling ──────────────────────────────────────────────────────────────

describe('request — error handling', () => {
  it('throws an ApiError with status 0 on a network failure', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(fetchGames()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    })
  })

  it('uses the "message" field of an error body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: 'Boom' }, 400))
    await expect(fetchGames()).rejects.toMatchObject({ message: 'Boom', status: 400 })
  })

  it('falls back to the "error" field when there is no "message"', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ error: 'Validation failed' }, 422))
    await expect(fetchGames()).rejects.toMatchObject({ message: 'Validation failed', status: 422 })
  })

  it('falls back to a generic message when the body has neither', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({}, 500))
    await expect(fetchGames()).rejects.toThrow('Error del servidor (500)')
  })

  it('exposes ApiError as the thrown type', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, 400))
    await expect(fetchGames()).rejects.toBeInstanceOf(ApiError)
  })
})

// ── 401 → refresh → retry cycle ─────────────────────────────────────────────────

describe('request — silent token refresh on 401', () => {
  it('refreshes the token and retries once on 401', async () => {
    const auth = useAuthStore()
    auth.setAuth('stale-token', null)
    auth.setRefreshToken('refresh-abc')

    fetch
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401)) // original request
      .mockResolvedValueOnce(jsonResponse({ token: 'fresh-token', refresh_token: 'refresh-def' })) // refresh
      .mockResolvedValueOnce(jsonResponse({ id: 'g1' })) // retried request

    const result = await fetchGames()

    expect(result).toEqual({ id: 'g1' })
    expect(fetch).toHaveBeenCalledTimes(3)
    // The refresh endpoint was hit with the stored refresh token.
    expect(fetch.mock.calls[1][0]).toBe(`${BASE}/api/auth/refresh`)
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ refresh_token: 'refresh-abc' })
    // Tokens were updated and the retry carried the fresh token.
    expect(auth.token).toBe('fresh-token')
    expect(auth.getRefreshToken()).toBe('refresh-def')
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh-token')
  })

  it('clears auth and surfaces the 401 when the refresh fails', async () => {
    const auth = useAuthStore()
    auth.setAuth('stale-token', null)
    auth.setRefreshToken('refresh-abc')

    fetch
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401)) // original request
      .mockResolvedValueOnce(jsonResponse({ error: 'invalid refresh' }, 401)) // refresh fails

    await expect(fetchGames()).rejects.toMatchObject({ status: 401 })
    expect(auth.token).toBeNull()
    expect(auth.getRefreshToken()).toBeNull()
  })

  it('does not attempt a refresh when there is no stored refresh token', async () => {
    useAuthStore().setAuth('stale-token', null)
    fetch.mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))

    await expect(fetchGames()).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

// ── Endpoint wrappers (method/path/body) ────────────────────────────────────────

describe('endpoint wrappers', () => {
  it('submitPrologue posts character data to the prologue endpoint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ current_phase: 'chapter_1' }))
    const data = { character_name: 'Aria', character_description: 'x', genre: 'Investigación', epoch: 'Victoriana' }

    await submitPrologue('g1', data)

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/game/g1/prologue`)
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual(data)
  })

  it('rollChapter posts the chosen attribute', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ outcome: 'hit' }))

    await rollChapter('g1', 'mind')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/game/g1/chapter/roll`)
    expect(JSON.parse(options.body)).toEqual({ attribute: 'mind' })
  })

  it('advanceEpilogue posts to the epilogue advance endpoint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ current_phase: 'epilogue_action_2' }))

    await advanceEpilogue('g1')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/game/g1/epilogue/advance`)
    expect(options.method).toBe('POST')
  })

  it('login posts credentials to the auth endpoint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ token: 't', refresh_token: 'r' }))

    await login('a@b.com', 'password123')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/auth/login`)
    expect(JSON.parse(options.body)).toEqual({ email: 'a@b.com', password: 'password123' })
  })

  it('register posts email, password and confirmation', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({}, 201))

    await register('a@b.com', 'password123', 'password123')

    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/api/auth/register`)
    expect(JSON.parse(options.body)).toEqual({
      email: 'a@b.com',
      password: 'password123',
      passwordConfirmation: 'password123',
    })
  })
})
