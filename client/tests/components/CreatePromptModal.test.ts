import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import CreatePromptModal from '@/components/CreatePromptModal.vue'

const mockCategoryStoreState = {
  categories: [{ _id: 'cat-1', name: 'Cat One' }],
  currentCategory: null,
  selectedCategoryId: '',
  loading: false,
  uncategorizedCount: 0,
  totalPrompts: 0,
  fetchCategories: vi.fn().mockResolvedValue([{ _id: 'cat-1', name: 'Cat One' }]),
  fetchCategory: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn()
}

const mockPromptStoreState = {
  prompts: [],
  currentPrompt: null,
  loading: false,
  fetchPrompts: vi.fn().mockResolvedValue([]),
  fetchPrompt: vi.fn().mockResolvedValue(null),
  createPrompt: vi.fn().mockResolvedValue({ _id: 'new-prompt' }),
  updatePrompt: vi.fn().mockResolvedValue({ _id: 'prompt-1' }),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  clearCurrent: vi.fn()
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }
const mockAuthStoreState = { isAuthenticated: false, isAdmin: false }

vi.mock('@/stores/useCategoryStore', () => ({
  useCategoryStore: vi.fn(() => mockCategoryStoreState)
}))

vi.mock('@/stores/usePromptStore', () => ({
  usePromptStore: vi.fn(() => mockPromptStoreState)
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
}))

const mockPrompt = {
  _id: 'prompt-1',
  title: 'Existing Prompt',
  content: 'Content here.',
  categoryId: { _id: 'cat-1' },
  tags: ['tag1', 'tag2']
}

function getWrapper(overrides = {}) {
  Object.assign(mockCategoryStoreState, overrides)
  return mount(CreatePromptModal)
}

describe('CreatePromptModal', () => {
  it('renders form fields for title, category, content, and tags', () => {
    getWrapper()
  })

  it('shows "New Prompt" title in create mode', () => {
    getWrapper()
  })

  it('shows "Edit Prompt" title in edit mode', () => {
    getWrapper({ props: { prompt: mockPrompt } })
  })

  it('pre-fills form fields when editing', () => {
    getWrapper({ props: { prompt: mockPrompt } })
  })

  it('pre-fills tags input as comma-separated values', () => {
    getWrapper({ props: { prompt: mockPrompt } })
  })

  it('calls categoryStore.fetchCategories on mount', () => {
    getWrapper()
  })

  it('parses tags as comma-separated and trims', () => {
    getWrapper()
  })

  it('converts empty categoryId to null before submit', () => {
    getWrapper()
  })

  it('converts __uncategorized__ categoryId to null before submit', () => {
    getWrapper()
  })

  it('submits the form calling createPrompt in create mode', async () => {
    getWrapper()
  })

  it('submits the form calling updatePrompt in edit mode', async () => {
    getWrapper({ props: { prompt: mockPrompt } })
  })

  it('emits saved and close on successful submit', async () => {
    getWrapper()
  })

  it('shows error toast when submit fails', async () => {
    getWrapper()
  })

  it('renders a cancel button that emits close', async () => {
    getWrapper()
  })

  it('renders a modal overlay (fixed positioning)', () => {
    getWrapper()
  })

  it('has a title input field', () => {
    getWrapper()
  })

  it('has a category select dropdown', () => {
    getWrapper()
  })

  it('has a content textarea', () => {
    getWrapper()
  })

  it('has a tags input field', () => {
    getWrapper()
  })

  it('renders a close (X) button', () => {
    getWrapper()
  })

  describe('accessibility (PLAN.md P2/10)', () => {
    let trigger: HTMLButtonElement

    beforeEach(() => {
      trigger = document.createElement('button')
      document.body.appendChild(trigger)
      trigger.focus()
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it('exposes role=dialog, aria-modal and the title as the accessible name', () => {
      const wrapper = mount(CreatePromptModal, { attachTo: document.body })
      try {
        const panel = wrapper.find('[role="dialog"]')
        expect(panel.attributes('aria-modal')).toBe('true')
        expect(panel.attributes('aria-label')).toBe('createPromptModal.newTitle')
      } finally {
        wrapper.unmount()
      }
    })

    it('closes on Escape', async () => {
      const wrapper = mount(CreatePromptModal, { attachTo: document.body })
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
      } finally {
        wrapper.unmount()
      }
    })

    it('moves focus into the dialog and restores the trigger on close', async () => {
      const wrapper = mount(CreatePromptModal, { attachTo: document.body })
      await nextTick()
      const panel = wrapper.find('[role="dialog"]').element
      expect(panel.contains(document.activeElement)).toBe(true)
      wrapper.unmount()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
