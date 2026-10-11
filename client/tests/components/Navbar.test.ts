import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import Navbar from '@/components/Navbar.vue'

const mockAuthStoreState = {
  token: 'tok',
  user: { _id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'user' },
  isAuthenticated: true,
  isAdmin: false,
  logout: vi.fn()
}

const mockI18nStoreState = { t: (key: string) => key, language: 'en', setLanguage: vi.fn() }

const mockThemeStoreState = { mode: 'auto', isDark: false, setMode: vi.fn() }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState)
}))

vi.mock('@/stores/useThemeStore', () => ({
  useThemeStore: vi.fn(() => mockThemeStoreState)
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ push: vi.fn() }) }
})

describe('Navbar', () => {
  it('closes the profile dropdown on an outside click (vueuse onClickOutside)', async () => {
    const wrapper = mount(Navbar, { attachTo: document.body })
    await nextTick()

    // The profile button is the first button in the authenticated header
    const profileButton = wrapper.find('button')
    expect(profileButton.exists()).toBe(true)
    await profileButton.trigger('click')
    await nextTick()

    // vueuse's onClickOutside debounces with a setTimeout(0) guard that
    // resets on a MACROTASK turn — yield one so the guard clears, like the
    // time gap between two real user clicks.
    await new Promise((r) => setTimeout(r, 0))

    // Dropdown menu exists and is visible (v-show removes display:none)
    const menu = wrapper.find('.z-50')
    expect(menu.exists()).toBe(true)
    expect(menu.attributes('style') ?? '').not.toContain('display: none')

    // Click outside (on the document body, outside the dropdown wrapper)
    document.body.click()
    await nextTick()

    const menuAfter = wrapper.find('.z-50')
    expect(menuAfter.attributes('style')).toContain('display: none')
  })

  // --- Accessible names (PLAN.md P2/14) ---

  it('gives the theme toggle buttons aria-label and aria-pressed', () => {
    const wrapper = mount(Navbar)
    // Buttons in DOM order: profile dropdown, logout (v-show menu), light,
    // dark, auto, then the language buttons.
    const [, , light, dark, auto] = wrapper.findAll('button')
    expect(light.attributes('aria-label')).toBe('theme.lightMode')
    expect(dark.attributes('aria-label')).toBe('theme.darkMode')
    expect(auto.attributes('aria-label')).toBe('theme.autoMode')
    // The mock store is in 'auto' mode: only that one is pressed.
    expect(light.attributes('aria-pressed')).toBe('false')
    expect(dark.attributes('aria-pressed')).toBe('false')
    expect(auto.attributes('aria-pressed')).toBe('true')
  })

  it('marks the active language with aria-pressed', () => {
    const wrapper = mount(Navbar)
    // …, es, eu, en are the last three buttons
    const buttons = wrapper.findAll('button')
    const [es, eu, en] = buttons.slice(-3)
    // The mock i18n store is on 'en'
    expect(es.attributes('aria-pressed')).toBe('false')
    expect(eu.attributes('aria-pressed')).toBe('false')
    expect(en.attributes('aria-pressed')).toBe('true')
  })
})
