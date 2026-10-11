import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'

// Mock the API module — all calls resolve to empty objects by default.
vi.mock('@/api/index.js', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      token: 'jwt-token',
      user: { _id: 'user-1', email: 'test@example.com', role: 'admin' }
    }),
    register: vi.fn().mockResolvedValue({
      token: 'jwt-token',
      user: { _id: 'user-1', email: 'test@example.com', role: 'admin' }
    }),
    getCurrentUser: vi
      .fn()
      .mockResolvedValue({ user: { _id: 'user-1', email: 'test@example.com', role: 'admin' } })
  },
  usersApi: { getAll: vi.fn(), getById: vi.fn(), update: vi.fn(), delete: vi.fn() }
}))

function createStoresAndSetActive() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

function getAuthStore() {
  const store = useAuthStore()
  // Ensure init has been called so state is populated from localStorage mock.
  if (store.token === null && store.user === null) {
    store.init()
  }
  return store
}

describe('useAuthStore', () => {
  beforeEach(() => {
    createStoresAndSetActive()
    // Reset localStorage mock between tests.
    ;(window.localStorage as { clear: () => void }).clear()
  })

  // --- init() ---

  it('initializes with null token and user when localStorage is empty', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
  })

  it('restores token and user from localStorage on init()', () => {
    const store = useAuthStore()
    const mockToken = 'saved-token'
    const mockUser = { _id: 'u1', email: 'a@b.com', role: 'user' }
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem(
      'token',
      mockToken
    )
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem(
      'user',
      JSON.stringify(mockUser)
    )
    store.init()
    expect(store.token).toBe(mockToken)
    expect(store.user).toEqual(mockUser)
  })

  // --- getters ---

  it('isAuthenticated returns true when token and user exist', () => {
    const store = getAuthStore()
    store.token = 'some-token'
    store.user = { _id: 'u1', email: 'a@b.com' }
    expect(store.isAuthenticated).toBe(true)
  })

  it('isAuthenticated returns false when token is missing', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAuthenticated returns false when user is missing', () => {
    const store = useAuthStore()
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem(
      'token',
      'some-token'
    )
    store.init()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAdmin returns true when user role is admin', () => {
    const store = getAuthStore()
    store.user = { _id: 'u1', email: 'a@b.com', role: 'admin' }
    expect(store.isAdmin).toBe(true)
  })

  it('isAdmin returns false when user role is not admin', () => {
    const store = useAuthStore()
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem('token', 't')
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem(
      'user',
      JSON.stringify({ _id: 'u1', email: 'a@b.com', role: 'user' })
    )
    store.init()
    expect(store.isAdmin).toBe(false)
  })

  it('isOwner returns true when resourceOwnerId matches user._id', () => {
    const store = getAuthStore()
    store.user = { _id: 'user-1', email: 'a@b.com' }
    expect(store.isOwner('user-1')).toBe(true)
  })

  it('isOwner returns false when resourceOwnerId does not match', () => {
    const store = getAuthStore()
    expect(store.isOwner('other-id')).toBe(false)
  })

  it('isOwner returns false when no user', () => {
    const store = useAuthStore()
    expect(store.isOwner('any-id')).toBe(false)
  })

  it('isOwner returns false when resourceOwnerId is null', () => {
    const store = getAuthStore()
    expect(store.isOwner(null as unknown as string)).toBe(false)
  })

  // --- login() ---

  it('login() saves token and user to state and localStorage on success', async () => {
    const store = useAuthStore()
    await store.login('test@example.com', 'password')
    expect(store.token).toBe('jwt-token')
    expect(store.user?._id).toBe('user-1')
    expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'jwt-token')
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify({ _id: 'user-1', email: 'test@example.com', role: 'admin' })
    )
  })

  it('login() calls authApi.login with correct arguments', async () => {
    const store = useAuthStore()
    await store.login('test@example.com', 'password')
    const { authApi } = await import('@/api/index.js')
    expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password')
  })

  it('login() throws on API error without modifying state', async () => {
    const { authApi } = await import('@/api/index.js')
    ;(authApi.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Invalid credentials')
    )
    const store = useAuthStore()
    await expect(store.login('bad', 'pass')).rejects.toThrow('Invalid credentials')
  })

  // --- register() ---

  it('register() saves token and user on success', async () => {
    const store = useAuthStore()
    await store.register('Name', 'test@example.com', 'password')
    expect(store.token).toBe('jwt-token')
    expect(store.user?._id).toBe('user-1')
  })

  it('register() calls authApi.register with correct arguments', async () => {
    const store = useAuthStore()
    await store.register('Name', 'test@example.com', 'password')
    const { authApi } = await import('@/api/index.js')
    expect(authApi.register).toHaveBeenCalledWith('Name', 'test@example.com', 'password')
  })

  // --- fetchCurrentUser() ---

  it('fetchCurrentUser() updates state.user on success', async () => {
    const store = useAuthStore()
    await store.fetchCurrentUser()
    expect(store.user?._id).toBe('user-1')
  })

  it('fetchCurrentUser() calls authApi.getCurrentUser', async () => {
    const store = useAuthStore()
    await store.fetchCurrentUser()
    const { authApi } = await import('@/api/index.js')
    expect(authApi.getCurrentUser).toHaveBeenCalled()
  })

  it('fetchCurrentUser() calls logout on API error (401)', async () => {
    const { authApi } = await import('@/api/index.js')
    ;(authApi.getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Unauthorized')
    )
    const store = useAuthStore()
    await store.fetchCurrentUser()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
  })

  // --- updateUser() ---

  it('updateUser() calls fetchCurrentUser', async () => {
    const store = useAuthStore()
    await store.updateUser()
    const { authApi } = await import('@/api/index.js')
    expect(authApi.getCurrentUser).toHaveBeenCalled()
  })

  // --- logout() ---

  it('logout() clears state and localStorage', () => {
    const store = useAuthStore()
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem('token', 't')
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem(
      'user',
      JSON.stringify({})
    )
    store.logout()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('token')
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('user')
  })
})
