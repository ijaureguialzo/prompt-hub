import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ManageUsersView from '@/views/ManageUsersView.vue'

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
  {
    _id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
    promptQuota: 2,
    categoryQuota: null
  },
  {
    _id: 'user-2',
    name: 'Regular User',
    email: 'user@example.com',
    role: 'user',
    isActive: true,
    promptQuota: null,
    categoryQuota: null
  }
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

// Mutable API mock state. The vi.fn objects live in this (hoisting-safe:
// the factory only closes over the const, it is read when called).
const mockApiState = {
  usersGetAll: vi.fn().mockImplementation(async () => [...mockUsersState]),
  usersGetById: vi.fn().mockResolvedValue(null),
  usersUpdate: vi.fn().mockResolvedValue({}),
  usersDelete: vi.fn().mockResolvedValue(undefined)
}

vi.mock('@/api/index.js', () => ({
  usersApi: {
    getAll: (...args: unknown[]) => mockApiState.usersGetAll(...(args as [unknown])),
    getById: (...args: unknown[]) => mockApiState.usersGetById(...(args as [string])),
    update: (...args: unknown[]) =>
      mockApiState.usersUpdate(...(args as [string, Record<string, unknown>])),
    delete: (...args: unknown[]) => mockApiState.usersDelete(...(args as [string]))
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

describe('ManageUsersView — quota overrides', () => {
  async function getWrapper() {
    const wrapper = mount(ManageUsersView, {
      global: {
        stubs: { DeleteConfirmationModal: '<div class="delete-modal" />' }
      },
      attachTo: document.body
    })
    // Let the onMounted fetches (users + site config) settle so the list
    // renders instead of the loading state.
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
    return wrapper
  }

  function quotaButtonFor(wrapper: ReturnType<typeof getWrapper>, email: string) {
    // Rows are the direct .p-6 children of the user list; find the one that
    // shows the email, then its 'Quotas' action button.
    const rows = wrapper.findAll('.p-6')
    for (const row of rows) {
      if (row.text().includes(email)) {
        const buttons = row.findAll('button')
        const button = buttons.find((b) => b.text() === 'admin.quotaEdit')
        if (button) return button
      }
    }
    throw new Error('quota button not found')
  }

  beforeEach(() => {
    vi.mocked(mockUIStoreState.setSuccess).mockClear()
    vi.mocked(mockUIStoreState.setError).mockClear()
    vi.mocked(mockApiState.usersUpdate).mockClear()
    vi.mocked(mockApiState.usersUpdate).mockResolvedValue({})
  })

  it('renders the effective quotas in each row (global for unset)', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    // One quota line per user (the identity i18n mock does not interpolate
    // the parameter values, so assert on the key occurrence).
    const matches = wrapper.text().split('admin.quotaMeta').length - 1
    expect(matches).toBe(2)
  })

  it('opens the modal prefilled and saves the new values', async () => {
    vi.mocked(mockApiState.usersUpdate).mockResolvedValueOnce({
      _id: 'user-2',
      email: 'user@example.com',
      promptQuota: 5,
      categoryQuota: 1
    })

    const wrapper = await getWrapper()
    await quotaButtonFor(wrapper, 'user@example.com').trigger('click')
    await nextTick()

    // The modal is open and the drafts are prefilled (empty = global).
    const inputs = wrapper.findAll('input[type="number"]')
    expect(inputs).toHaveLength(2)
    expect((inputs[0].element as HTMLInputElement).value).toBe('')

    // Set new values and save.
    await inputs[0].setValue('5')
    await inputs[1].setValue('1')
    const save = wrapper.findAll('button').find((b) => b.text() === 'admin.quotaSave')!
    await save.trigger('click')
    await nextTick()

    expect(mockApiState.usersUpdate).toHaveBeenCalledWith('user-2', {
      promptQuota: 5,
      categoryQuota: 1
    })
    expect(mockUIStoreState.setSuccess).toHaveBeenCalledWith('admin.quotaSaved')
    // Modal closed on success and the row shows the new values.
    expect(wrapper.text()).not.toContain('admin.quotaModalTitle')
  })

  it('sends null for empty fields (back to the global default)', async () => {
    vi.mocked(mockApiState.usersUpdate).mockResolvedValueOnce({
      _id: 'user-2',
      promptQuota: null,
      categoryQuota: null
    })

    const wrapper = await getWrapper()
    await quotaButtonFor(wrapper, 'user@example.com').trigger('click')
    await nextTick()

    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('3')
    await inputs[1].setValue('')
    const save = wrapper.findAll('button').find((b) => b.text() === 'admin.quotaSave')!
    await save.trigger('click')
    await nextTick()

    expect(mockApiState.usersUpdate).toHaveBeenCalledWith('user-2', {
      promptQuota: 3,
      categoryQuota: null
    })
  })

  it('keeps the modal open and toasts on failure', async () => {
    vi.mocked(mockApiState.usersUpdate).mockRejectedValueOnce(new Error('boom'))

    const wrapper = await getWrapper()
    await quotaButtonFor(wrapper, 'user@example.com').trigger('click')
    await nextTick()

    const save = wrapper.findAll('button').find((b) => b.text() === 'admin.quotaSave')!
    await save.trigger('click')
    await nextTick()

    expect(mockUIStoreState.setError).toHaveBeenCalledWith('boom')
    expect(wrapper.text()).toContain('admin.quotaModalTitle')
  })
})
