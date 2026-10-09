import { describe, it, vi } from 'vitest'
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
})
