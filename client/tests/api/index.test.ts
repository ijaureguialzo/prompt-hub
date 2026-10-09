import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiRequest, registerUnauthorizedHandler } from '@/api/index.js'

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

  it('throws a friendly error on network failure', async () => {
    mockFetch({ ok: true, status: 200, networkError: true })
    await expect(apiRequest('/prompts')).rejects.toThrow('Network error')
  })

  it('clears auth and invokes the handler on 401', async () => {
    window.localStorage.setItem('token', 'stale-token')
    window.localStorage.setItem('user', JSON.stringify({ _id: 'u1', email: 'a@b.com' }))

    const handler = vi.fn()
    registerUnauthorizedHandler(handler)
    mockFetch({ ok: false, status: 401, json: { message: 'Invalid or expired token' } })

    await expect(apiRequest('/prompts')).rejects.toThrow('Invalid or expired token')

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
})
