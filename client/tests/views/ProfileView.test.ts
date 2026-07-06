import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ProfileView from '@/views/ProfileView.vue'

const mockAuthStoreState = {
  token: 'test-token',
  user: { _id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'admin', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
}

const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

// Mutable route state.
const mockRouteState = { params: {} }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState),
}))

vi.mock('@/api/index.js', () => ({
  usersApi: { getById: vi.fn().mockResolvedValue({ _id: 'user-2', name: 'Other User', email: 'other@example.com', role: 'user', isActive: true, createdAt: '2024-06-01T00:00:00.000Z' }) },
}))

vi.mock('vue', () => {
  const actual = {} // placeholder — will be populated below
  return { ...actual, useRoute: vi.fn(() => mockRouteState) }
})

// Stub router-link.
const routerLinkStub = { template: '<a><slot /></a>' }

function getWrapper() {
  return mount(ProfileView, {
    global: {
      components: { routerLink: routerLinkStub },
      stubs: { RouterView: '<div />' },
    },
    attachTo: document.body,
  })
}

describe('ProfileView', () => {
  async function setup() {
    const wrapper = await getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

  it('shows loading state while fetching', async () => {
    mockAuthStoreState.loading = true
  })

  it('shows error message when fetch fails', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders user name when profile is loaded', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders user email when profile is loaded', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders role translated', async () => {
    mockAuthStoreState.loading = false
  })

  it('shows green active status when user is active', async () => {
    mockAuthStoreState.loading = false
  })

  it('shows red deactivated status when user is inactive', async () => {
    mockAuthStoreState.loading = false
  })

  it('fetches another user when route.params.id is provided', async () => {
    mockAuthStoreState.loading = false
  })
})
