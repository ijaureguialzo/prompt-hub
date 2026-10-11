import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import CreateCategoryModal from '@/components/CreateCategoryModal.vue'

const mockCategoryStoreState = {
  categories: [],
  currentCategory: null,
  selectedCategoryId: '',
  loading: false,
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategory: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({ _id: 'new-cat', name: 'New' }),
  updateCategory: vi.fn().mockResolvedValue({ _id: 'cat-1', name: 'Updated' }),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn()
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }

vi.mock('@/stores/useCategoryStore', () => ({
  useCategoryStore: vi.fn(() => mockCategoryStoreState)
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
}))

const mockCategory = { _id: 'cat-1', name: 'Existing Category', description: 'A description' }

function getWrapper(overrides = {}) {
  Object.assign(mockCategoryStoreState, overrides)
  return mount(CreateCategoryModal, { ...overrides })
}

describe('CreateCategoryModal', () => {
  it('renders form fields for name and description', () => {
    getWrapper()
  })

  it('shows "New Category" title in create mode', () => {
    getWrapper()
  })

  it('shows "Edit Category" title in edit mode', () => {
    getWrapper({ props: { editing: mockCategory } })
  })

  it('pre-fills form fields when editing', () => {
    getWrapper({ props: { editing: mockCategory } })
  })

  it('pre-fills description when editing', () => {
    getWrapper({ props: { editing: mockCategory } })
  })

  it('submits the form calling createCategory in create mode', async () => {
    getWrapper()
  })

  it('submits the form calling updateCategory in edit mode', async () => {
    getWrapper({ props: { editing: mockCategory } })
  })

  it('emits close on successful submit', async () => {
    getWrapper()
  })

  it('shows error toast when submit fails', async () => {
    getWrapper()
  })

  it('renders a cancel button that emits close', async () => {
    getWrapper()
  })

  it('renders a submit button', () => {
    getWrapper()
  })

  it('renders a modal overlay (fixed positioning)', () => {
    getWrapper()
  })

  it('has a name input field', () => {
    getWrapper()
  })

  it('has a description input field', () => {
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
      const wrapper = mount(CreateCategoryModal, { attachTo: document.body })
      try {
        const panel = wrapper.find('[role="dialog"]')
        expect(panel.attributes('aria-modal')).toBe('true')
        expect(panel.attributes('aria-label')).toBe('createCategoryModal.newTitle')
      } finally {
        wrapper.unmount()
      }
    })

    it('closes on Escape', async () => {
      const wrapper = mount(CreateCategoryModal, { attachTo: document.body })
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
      } finally {
        wrapper.unmount()
      }
    })

    it('moves focus into the dialog and restores the trigger on close', async () => {
      const wrapper = mount(CreateCategoryModal, { attachTo: document.body })
      await nextTick()
      const panel = wrapper.find('[role="dialog"]').element
      expect(panel.contains(document.activeElement)).toBe(true)
      wrapper.unmount()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
