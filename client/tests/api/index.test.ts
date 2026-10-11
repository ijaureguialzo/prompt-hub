import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiRequest, registerUnauthorizedHandler } from '@/api/index.js'
import { useI18nStore } from '@/stores/useI18nStore.js'

// Tests the REAL api client (not mocked) with a mocked global fetch.

function mockFetch(response: {
  ok: boolean
  status: number
  body?: string
  json?: unknown
  networkError?: boolean
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (response.networkError) throw new Error('fetch failed')
      return {
        ok: response.ok,
        status: response.status,
        text: async () => response.body ?? JSON.stringify(response.json ?? {})
      }
    })
  )
}

describe('api client', () => {
  beforeEach(() => {
    window.localStorage.clear()
    registerUnauthorizedHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    registerUnauthorizedHandler(null)
  })

  it('returns parsed JSON on success', async () => {
    mockFetch({ ok: true, status: 200, json: { hello: 'world' } })
    const data = await apiRequest('/prompts')
    expect(data).toEqual({ hello: 'world' })
  })

  it('sends the Bearer token when present', async () => {
    window.localStorage.setItem('token', 'my-token')
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'null'
    }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/prompts')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/prompts')
    expect(options.headers.Authorization).toBe('Bearer my-token')
  })

  it('throws with the server message on error', async () => {
    mockFetch({ ok: false, status: 400, json: { message: 'Prompt title is required' } })
    await expect(apiRequest('/prompts')).rejects.toThrow('Prompt title is required')
  })

  it('survives a non-JSON error body (e.g. reverse proxy error page)', async () => {
    mockFetch({ ok: false, status: 502, body: '<html>Bad Gateway</html>' })
    await expect(apiRequest('/prompts')).rejects.toThrow('Request failed')
  })

  it('throws an explicit error when an ok response has a non-JSON body', async () => {
    // The P0 silent-failure: a reverse proxy serving the SPA's index.html
    // with a 200 must be loud, not an empty app.
    mockFetch({ ok: true, status: 200, body: '<html><body>SPA</body></html>' })
    await expect(apiRequest('/auth/login')).rejects.toThrow(
      'Unexpected response from the API'
    )
  })

  it('throws an explicit error when an ok response has an empty body', async () => {
    mockFetch({ ok: true, status: 200, body: '' })
    await expect(apiRequest('/prompts')).rejects.toThrow('Unexpected response from the API')
  })

  it('throws a friendly error on network failure', async () => {
    mockFetch({ ok: true, status: 200, networkError: true })
    await expect(apiRequest('/prompts')).rejects.toThrow('Network error')
  })

  it('normalizes an aborted request into a recognizable AbortError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('Aborted', 'AbortError')))
    )
    const error = await apiRequest('/prompts').catch((e) => e)
    expect(error.name).toBe('AbortError')
    expect(error.message).toBe('The request was aborted.')
  })

  it('treats an abort while reading the body as an AbortError, not a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: () => Promise.reject(new DOMException('Aborted', 'AbortError'))
      }))
    )
    const error = await apiRequest('/prompts').catch((e) => e)
    expect(error.name).toBe('AbortError')
  })

  it('passes a caller-provided signal through to fetch', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '{}'
    }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await apiRequest('/prompts', { signal: controller.signal })
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('clears auth and invokes the handler on 401', async () => {
    window.localStorage.setItem('token', 'stale-token')
    window.localStorage.setItem('user', JSON.stringify({ _id: 'u1', email: 'a@b.com' }))

    const handler = vi.fn()
    registerUnauthorizedHandler(handler)
    mockFetch({
      ok: false,
      status: 401,
      json: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    })

    await expect(apiRequest('/prompts')).rejects.toThrow(
      'Your session has expired. Please sign in again.'
    )

    expect(window.localStorage.getItem('token')).toBeNull()
    expect(window.localStorage.getItem('user')).toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(window.location.pathname)
  })

  it('does not invoke the handler twice and works without a handler', async () => {
    window.localStorage.setItem('token', 'stale-token')
    mockFetch({ ok: false, status: 401, json: { message: 'Invalid' } })
    // No handler registered: must still throw, no crash
    await expect(apiRequest('/prompts')).rejects.toThrow('Invalid')
  })

  it('falls back to the server message for unknown error codes', async () => {
    mockFetch({ ok: false, status: 418, json: { code: 'TEAPOT', message: 'I am a teapot' } })
    await expect(apiRequest('/prompts')).rejects.toThrow('I am a teapot')
  })
})

// The real user scenario behind the localization: with an active pinia and
// a non-English UI language, server error codes are translated before the
// toast sees them.
describe('api client error localization', () => {
  beforeEach(() => {
    window.localStorage.clear()
    registerUnauthorizedHandler(null)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    registerUnauthorizedHandler(null)
    setActivePinia(null)
  })

  it('translates an expired-session 401 into the selected language (es)', async () => {
    useI18nStore().setLanguage('es')
    mockFetch({
      ok: false,
      status: 401,
      json: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    })

    await expect(apiRequest('/prompts')).rejects.toThrow(
      'Tu sesión ha caducado. Inicia sesión de nuevo.'
    )
  })

  it('localizes the invalid-response error into the selected language (es)', async () => {
    useI18nStore().setLanguage('es')
    mockFetch({ ok: true, status: 200, body: '<html></html>' })
    await expect(apiRequest('/prompts')).rejects.toThrow('Respuesta inesperada de la API')
  })

  it('translates into the selected language (eu)', async () => {
    useI18nStore().setLanguage('eu')
    mockFetch({
      ok: false,
      status: 401,
      json: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    })

    await expect(apiRequest('/prompts')).rejects.toThrow(
      'Zure saioa amaitu da. Hasieratu saioa berriro, mesedez.'
    )
  })

  it('keeps English when the UI language is English', async () => {
    useI18nStore().setLanguage('en')
    mockFetch({
      ok: false,
      status: 401,
      json: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    })

    await expect(apiRequest('/prompts')).rejects.toThrow(
      'Your session has expired. Please sign in again.'
    )
  })

  it('interpolates parameters into the localized message', async () => {
    useI18nStore().setLanguage('es')
    mockFetch({
      ok: false,
      status: 409,
      json: { code: 'LIMIT_REACHED', message: 'Prompt limit reached (200 per user)', limit: 200 }
    })

    await expect(apiRequest('/prompts')).rejects.toThrow(
      'Has alcanzado el límite por usuario (200).'
    )
  })

  it('translates validation and credential errors', async () => {
    useI18nStore().setLanguage('es')
    mockFetch({
      ok: false,
      status: 401,
      json: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
    })
    await expect(apiRequest('/auth/login')).rejects.toThrow('Correo o contraseña no válidos.')

    mockFetch({
      ok: false,
      status: 409,
      json: { code: 'EMAIL_TAKEN', message: 'Email already registered' }
    })
    await expect(apiRequest('/auth/register')).rejects.toThrow('Este correo ya está registrado.')
  })

  it('translates the account-locked error', async () => {
    useI18nStore().setLanguage('es')
    mockFetch({
      ok: false,
      status: 401,
      json: {
        code: 'ACCOUNT_LOCKED',
        message: 'Account temporarily locked. Try again in 15 minutes.'
      }
    })
    await expect(apiRequest('/auth/login')).rejects.toThrow(
      'Demasiados intentos de acceso fallidos: esta cuenta está bloqueada temporalmente. Inténtalo de nuevo en 15 minutos.'
    )
  })
})
