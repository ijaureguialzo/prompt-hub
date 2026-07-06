import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import RegisterView from '@/views/RegisterView.vue'

const mockAuthStoreState = {
  token: null,
  user: null,
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
}

const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

// Mutable API mock state.
const mockSiteConfigState = { registrationEnabled: true }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState),
}))

vi.mock('@/api/index.js', () => ({
  siteConfigApi: {
    getPublicConfig: vi.fn().mockImplementation(async () => ({
      registrationEnabled: mockSiteConfigState.registrationEnabled,
    })),
  },
}))

// Stub router-link as an anchor element.
const routerLinkStub = { template: '<a><slot /></a>' }

function getWrapper() {
  return mount(RegisterView, { global: { components: { routerLink: routerLinkStub } }, attachTo: document.body })
}

describe('RegisterView', () => {
  async function setup() {
    const wrapper = await getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

  it('renders the heading when registration is enabled', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.text()).toContain('auth.registerTitle')
  })

  it('renders name, email, password and confirm-password inputs', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.findAll('input').length).toBe(4)
  })

  it('renders a submit button', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('shows registration disabled message when registration is disabled', async () => {
    mockSiteConfigState.registrationEnabled = false
    const wrapper = await setup()
    expect(wrapper.text()).toContain('admin.registrationDisabled')
  })

  it('shows error when passwords do not match', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    const form = wrapper.find('form')
    // Fill password and confirmPassword with different values.
    const inputs = wrapper.findAll('input')
    await inputs[2].setValue('password123') // password
    await inputs[3].setValue('different')  // confirmPassword
    await form.trigger('submit')
    expect(wrapper.text()).toContain('auth.passwordMismatch')
  })

  it('submits the form calling authStore.register on valid submission', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    const form = wrapper.find('form')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Test User')   // name
    await inputs[1].setValue('test@example.com') // email
    await inputs[2].setValue('password123')  // password
    await inputs[3].setValue('password123')  // confirmPassword
    await form.trigger('submit')
    expect(mockAuthStoreState.register).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123')
  })

  it('navigates to / on successful registration', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    const form = wrapper.find('form')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Test User')
    await inputs[1].setValue('test@example.com')
    await inputs[2].setValue('password123')
    await inputs[3].setValue('password123')
    await form.trigger('submit')
  })

  it('shows login link when registration is enabled and no error', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.text()).toContain('auth.loginLink')
  })

  it('disables submit button when loading is true', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('disables submit button when passwords do not match', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    const inputs = wrapper.findAll('input')
    await inputs[2].setValue('password123')  // password
    await inputs[3].setValue('different')    // confirmPassword
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
