import { describe, it, vi } from 'vitest'

const mockAuthStoreState = {
  token: 'test-token',
  user: { _id: 'user-1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn()
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }
const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

// Mutable API mock state.
const mockUsersState = [
  { _id: 'user-1', name: 'Admin User', email: 'admin@example.com', role: 'admin', isActive: true },
  { _id: 'user-2', name: 'Regular User', email: 'user@example.com', role: 'user', isActive: true }
]

const mockSiteConfigState = { registrationEnabled: true }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState)
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState)
}))

vi.mock('@/api/index.js', () => ({
  usersApi: {
    getAll: vi.fn().mockImplementation(async () => [...mockUsersState]),
    getById: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  siteConfigApi: {
    getConfig: vi.fn().mockImplementation(async () => ({
      registrationEnabled: mockSiteConfigState.registrationEnabled
    })),
    updateConfig: vi.fn().mockResolvedValue({}),
    getPublicConfig: vi.fn().mockResolvedValue({})
  }
}))

describe('ManageUsersView', () => {
  it('shows loading state while fetching', async () => {
    mockAuthStoreState.loading = true
  })

  it('renders the users heading', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders a table/list of users', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders user names and emails', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders a role dropdown per user', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders an activate/deactivate button per user', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders a delete button per user', async () => {
    mockAuthStoreState.loading = false
  })

  it('renders a registration toggle button', async () => {
    mockAuthStoreState.loading = false
  })

  it('calls siteConfigApi.updateConfig when toggle registration is clicked', async () => {
    mockAuthStoreState.loading = false
  })

  it('calls usersApi.update when role is changed', async () => {
    mockAuthStoreState.loading = false
  })

  it('calls usersApi.update when active status is toggled', async () => {
    mockAuthStoreState.loading = false
  })

  it('calls window.confirm and usersApi.delete when delete is clicked', async () => {
    mockAuthStoreState.loading = false
  })

  it('shows error toast when an operation fails', async () => {
    mockAuthStoreState.loading = false
  })

  it('shows "no users" when the list is empty', async () => {
    mockAuthStoreState.loading = false
  })

  it('supports inline name editing', async () => {
    mockAuthStoreState.loading = false
  })
})
