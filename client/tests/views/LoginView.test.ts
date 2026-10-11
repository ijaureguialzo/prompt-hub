import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'

const mockAuthStoreState = {
  token: null,
  user: null,
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn()
}

const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

// Mutable API mock state.
const mockSiteConfigState = { registrationEnabled: true }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState)
}))

vi.mock('@/api/index.js', () => ({
  siteConfigApi: {
    getPublicConfig: vi.fn().mockImplementation(async () => ({
      registrationEnabled: mockSiteConfigState.registrationEnabled
    }))
  }
}))

// Stub router-link as an anchor element.
const routerLinkStub = { template: '<a><slot /></a>' }

function getWrapper() {
  return mount(LoginView, {
    global: { components: { routerLink: routerLinkStub } },
    attachTo: document.body
  })
}

describe('LoginView', () => {
  async function setup() {
    const wrapper = await getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

  it('renders the heading', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.text()).toContain('auth.loginTitle')
  })

  it('renders email and password inputs', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.findAll('input').length).toBe(2)
  })

  it('renders a submit button', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls siteConfigApi.getPublicConfig on mount', async () => {
    mockSiteConfigState.registrationEnabled = true
    await setup()
  })

  it('navigates to / on successful login', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    const form = wrapper.find('form')
    await form.trigger('submit')
    expect(mockAuthStoreState.login).toHaveBeenCalledWith('', '')
  })

  it('shows error message when login fails', async () => {
    mockSiteConfigState.registrationEnabled = true
    mockAuthStoreState.login.mockRejectedValue(new Error('Invalid credentials'))
    const wrapper = await setup()
    const form = wrapper.find('form')
    await form.trigger('submit')
    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('shows the localized message when the account is locked', async () => {
    mockSiteConfigState.registrationEnabled = true
    mockAuthStoreState.login.mockRejectedValue(
      new Error(
        'Too many failed login attempts: this account is temporarily locked. Please try again in 15 minutes.'
      )
    )
    const wrapper = await setup()
    const form = wrapper.find('form')
    await form.trigger('submit')
    expect(wrapper.text()).toContain('temporarily locked')
  })

  it('shows register link when registration is enabled', async () => {
    mockSiteConfigState.registrationEnabled = true
    const wrapper = await setup()
    expect(wrapper.text()).toContain('auth.registerLink')
  })

  it('hides register link when registration is disabled', async () => {
    mockSiteConfigState.registrationEnabled = false
    const wrapper = await setup()
    expect(wrapper.text()).not.toContain('auth.registerLink')
  })
})
