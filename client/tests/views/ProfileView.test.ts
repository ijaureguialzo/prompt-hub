import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ProfileView from '@/views/ProfileView.vue'

// Mutable route state, hoisted so the vi.mock factory below can reference it.
const mockRouteState = vi.hoisted(() => ({ params: {} as Record<string, string> }))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRoute: () => mockRouteState }
})

const mockAuthStoreState = {
  token: 'test-token',
  user: { _id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' },
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  updateMe: vi.fn().mockResolvedValue({ user: { _id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user', isActive: true, createdAt: '2024-01-01T00:00:00.000Z' } }),
  logout: vi.fn(),
}

const mockUIStoreState = {
  setError: vi.fn(),
  setSuccess: vi.fn(),
}

const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState),
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState),
}))

vi.mock('@/api/index.js', () => ({
  usersApi: { getById: vi.fn().mockResolvedValue({ _id: 'user-2', name: 'Other User', email: 'other@example.com', role: 'user', isActive: true, createdAt: '2024-06-01T00:00:00.000Z' }) },
}))

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
  async function setup(routeId?: string) {
    mockRouteState.params = routeId ? { id: routeId } : {}
    const wrapper = getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

  it('renders the user name and email for own profile', async () => {
    mockAuthStoreState.loading = false
    const wrapper = await setup()
    expect(wrapper.text()).toContain('Test User')
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('shows the security (change password) card for own profile', async () => {
    mockAuthStoreState.loading = false
    const wrapper = await setup()
    expect(wrapper.text()).toContain('profile.securityTitle')
    expect(wrapper.text()).toContain('profile.changePassword')
  })

  it('does NOT show the password card when viewing another user', async () => {
    mockAuthStoreState.loading = false
    const wrapper = await setup('user-2')
    expect(wrapper.text()).toContain('Other User')
    expect(wrapper.text()).not.toContain('profile.securityTitle')
  })

  it('saves a new name via the auth store', async () => {
    mockAuthStoreState.loading = false
    const wrapper = await setup()
    // start name editing, change the draft, save on blur
    const nameEl = wrapper.findAll('p').find((p) => p.text() === 'Test User')
    expect(nameEl).toBeDefined()
    await nameEl!.trigger('click')
    await nextTick()
    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBe(true)
    await input.setValue('New Name')
    await input.trigger('blur')
    await nextTick()
    expect(mockAuthStoreState.updateMe).toHaveBeenCalledWith({ name: 'New Name' })
    expect(mockUIStoreState.setSuccess).toHaveBeenCalled()
  })

  it('rejects a password change when confirmation does not match', async () => {
    mockAuthStoreState.loading = false
    const wrapper = await setup()

    const passwordInputs = wrapper.findAll('input[type="password"]')
    expect(passwordInputs.length).toBe(3)
    await passwordInputs[0].setValue('current-pass-123')
    await passwordInputs[1].setValue('new-password-456')
    await passwordInputs[2].setValue('different-password')
    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(mockAuthStoreState.updateMe).not.toHaveBeenCalled()
    expect(mockUIStoreState.setError).toHaveBeenCalledWith('profile.passwordMismatch')
  })

  it('sends the password change to the auth store when valid', async () => {
    mockAuthStoreState.loading = false
    const wrapper = await setup()

    const passwordInputs = wrapper.findAll('input[type="password"]')
    await passwordInputs[0].setValue('current-pass-123')
    await passwordInputs[1].setValue('new-password-456')
    await passwordInputs[2].setValue('new-password-456')
    await wrapper.find('button').trigger('click')
    await nextTick()

    expect(mockAuthStoreState.updateMe).toHaveBeenCalledWith({
      currentPassword: 'current-pass-123',
      newPassword: 'new-password-456',
    })
    expect(mockUIStoreState.setSuccess).toHaveBeenCalledWith('profile.passwordChanged')
  })
})
