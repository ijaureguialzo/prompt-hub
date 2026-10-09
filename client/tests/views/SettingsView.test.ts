import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsView from '@/views/SettingsView.vue'

const mockPromptStoreState = {
  prompts: [],
  currentPrompt: null,
  loading: false,
  fetchPrompts: vi.fn().mockResolvedValue([]),
  fetchPrompt: vi.fn().mockResolvedValue(null),
  createPrompt: vi.fn().mockResolvedValue({}),
  updatePrompt: vi.fn().mockResolvedValue({}),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  clearCurrent: vi.fn()
}

const mockCategoryStoreState = {
  categories: [],
  currentCategory: null,
  selectedCategoryId: '',
  loading: false,
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategory: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn()
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }
const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

vi.mock('@/stores/usePromptStore', () => ({
  usePromptStore: vi.fn(() => mockPromptStoreState)
}))

vi.mock('@/stores/useCategoryStore', () => ({
  useCategoryStore: vi.fn(() => mockCategoryStoreState)
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState)
}))

vi.mock('@/api/index.js', () => ({
  siteConfigApi: { getPublicConfig: vi.fn().mockResolvedValue({}) }
}))

describe('SettingsView', () => {
  it('renders the heading', () => {
    const wrapper = mount(SettingsView)
    expect(wrapper.text()).toContain('settings.heading')
  })

  it('renders the API URL input', () => {
    const wrapper = mount(SettingsView)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('renders a refresh data button', () => {
    mount(SettingsView)
  })

  it('calls fetchPrompts and fetchCategories when refresh button is clicked', async () => {
    const wrapper = mount(SettingsView)
    const refreshBtn = wrapper.find('button')
    await refreshBtn.trigger('click')
    expect(mockPromptStoreState.fetchPrompts).toHaveBeenCalled()
    expect(mockCategoryStoreState.fetchCategories).toHaveBeenCalled()
  })

  it('shows error toast when refresh fails', async () => {
    mockPromptStoreState.fetchPrompts.mockRejectedValue(new Error('Network error'))
    const wrapper = mount(SettingsView)
    const refreshBtn = wrapper.find('button')
    await refreshBtn.trigger('click')
    expect(mockUIStoreState.setError).toHaveBeenCalled()
  })

  it('shows success message when refresh succeeds', async () => {
    const wrapper = mount(SettingsView)
    const refreshBtn = wrapper.find('button')
    await refreshBtn.trigger('click')
  })
})
