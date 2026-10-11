import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '@/App.vue'

const mockAuthStoreState = {
  token: 'tok',
  user: { _id: 'u1', name: 'Test', email: 't@example.com', role: 'user' },
  isAuthenticated: true,
  isAdmin: false,
  init: vi.fn(),
  fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn()
}

const mockThemeStoreState = { mode: 'auto', isDark: false, setMode: vi.fn(), dispose: vi.fn() }

const mockI18nStoreState = { t: (key: string) => key, language: 'en', setLanguage: vi.fn() }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState)
}))

vi.mock('@/stores/useThemeStore', () => ({
  useThemeStore: vi.fn(() => mockThemeStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState)
}))

const stubs = { Navbar: true, Toast: true, 'router-view': true }

describe('App bootstrap (PLAN.md P2/19)', () => {
  beforeEach(() => {
    createPinia()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAuthStoreState.isAuthenticated = true
    mockAuthStoreState.token = 'tok'
  })

  it('refreshes the current user after init when a session exists', async () => {
    mount(App, { global: { stubs } })
    await nextTick()
    expect(mockAuthStoreState.init).toHaveBeenCalled()
    // A stale role (admin changed it) must not survive a page load.
    expect(mockAuthStoreState.fetchCurrentUser).toHaveBeenCalled()
  })

  it('skips the user refresh when there is no session', async () => {
    mockAuthStoreState.isAuthenticated = false
    mockAuthStoreState.token = null
    mount(App, { global: { stubs } })
    await nextTick()
    expect(mockAuthStoreState.init).toHaveBeenCalled()
    expect(mockAuthStoreState.fetchCurrentUser).not.toHaveBeenCalled()
  })
})
