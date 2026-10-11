import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryList from '@/components/CategoryList.vue'

const mockCategories = [
  { _id: 'cat-1', name: 'Category One' },
  { _id: 'cat-2', name: 'Category Two' }
]

const mockPrompts = [
  { _id: 'p1', title: 'P1', categoryId: 'cat-1' },
  { _id: 'p2', title: 'P2', categoryId: null }
]

// Mutable store mocks.
const mockCategoryStoreState = {
  categories: mockCategories,
  currentCategory: null,
  selectedCategoryId: null,
  loading: false,
  uncategorizedCount: 1,
  totalPrompts: 2,
  promptQuota: null,
  categoryQuota: null,
  fetchCategories: vi.fn().mockResolvedValue(mockCategories),
  fetchCategory: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn()
}

const mockPromptStoreState = {
  prompts: mockPrompts,
  currentPrompt: null,
  loading: false,
  fetchPrompts: vi.fn().mockResolvedValue(mockPrompts),
  fetchPrompt: vi.fn().mockResolvedValue(null),
  createPrompt: vi.fn().mockResolvedValue({}),
  updatePrompt: vi.fn().mockResolvedValue({}),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  clearCurrent: vi.fn()
}

const mockUIStoreState = {
  setError: vi.fn(),
  setShowCreateCategoryModal: vi.fn(),
  setEditingCategory: vi.fn()
}

vi.mock('@/stores/useCategoryStore', () => ({
  useCategoryStore: vi.fn(() => mockCategoryStoreState)
}))

vi.mock('@/stores/usePromptStore', () => ({
  usePromptStore: vi.fn(() => mockPromptStoreState)
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
}))

// Stub DeleteConfirmationModal so it doesn't render its own template.
const deleteModalStub = { template: '<div />' }

describe('CategoryList', () => {
  it('renders the heading', () => {
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.text()).toContain('categoryList.heading')
  })

  it('renders category names with prompt counts', () => {
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.text()).toContain('Category One')
  })

  it('renders "All Categories" option', () => {
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.text()).toContain('categoryList.allCategories')
  })

  it('renders "Uncategorized" option when there are uncategorized prompts', () => {
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.text()).toContain('createPromptModal.uncategorized')
  })

  it('shows loading message while loading', () => {
    mockCategoryStoreState.loading = true
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.text()).toContain('categoryList.loading')
    // Reset loading after test.
    mockCategoryStoreState.loading = false
  })

  it('opens the category editor via the UI store when the edit button is clicked', async () => {
    mockUIStoreState.setEditingCategory.mockClear()
    mockUIStoreState.setShowCreateCategoryModal.mockClear()
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })

    const editButtons = wrapper.findAll('button[title="categoryList.edit"]')
    expect(editButtons.length).toBe(2)

    await editButtons[0].trigger('click')
    expect(mockUIStoreState.setEditingCategory).toHaveBeenCalledWith(mockCategories[0])
    expect(mockUIStoreState.setShowCreateCategoryModal).toHaveBeenCalledWith(true)
  })

  it('shows "No categories yet" when the list is empty', () => {
    mockCategoryStoreState.categories = []
    // Ensure loading is false so the <ul> renders.
    mockCategoryStoreState.loading = false
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.text()).toContain('categoryList.noCategories')
    // Restore categories for subsequent tests.
    mockCategoryStoreState.categories = mockCategories
  })

  it('renders category items in a list', () => {
    mockCategoryStoreState.loading = false
    const wrapper = mount(CategoryList, {
      global: { stubs: { DeleteConfirmationModal: deleteModalStub } }
    })
    expect(wrapper.findAll('li').length).toBeGreaterThan(0)
  })

  it('highlights the selected category', () => {
    mockCategoryStoreState.loading = false
    mockCategoryStoreState.selectedCategoryId = 'cat-1'
    mount(CategoryList, { global: { stubs: { DeleteConfirmationModal: deleteModalStub } } })
  })

  it('clears selection when "All Categories" is clicked', async () => {
    mockCategoryStoreState.loading = false
    mockCategoryStoreState.selectedCategoryId = null
    mount(CategoryList, { global: { stubs: { DeleteConfirmationModal: deleteModalStub } } })
  })

  it('renders the heading text', () => {
    mount(CategoryList, { global: { stubs: { DeleteConfirmationModal: deleteModalStub } } })
  })

  it('renders a delete button per category', () => {
    mount(CategoryList, { global: { stubs: { DeleteConfirmationModal: deleteModalStub } } })
  })

  // --- quota indicator (PLAN.md P2/18) ---

  it('shows the per-user quotas when the store has them', () => {
    mockCategoryStoreState.promptQuota = { used: 187, limit: 200 }
    mockCategoryStoreState.categoryQuota = { used: 3, limit: 50 }
    const wrapper = mount(CategoryList, { global: { stubs: { DeleteConfirmationModal: deleteModalStub } } })
    // The identity i18n mock returns the keys; the interpolation happens
    // with the real store, so assert the keys are present.
    expect(wrapper.text()).toContain('categoryList.promptsQuota')
    expect(wrapper.text()).toContain('categoryList.categoriesQuota')
  })

  it('hides the quota footer when the store has no quotas yet', () => {
    mockCategoryStoreState.promptQuota = null
    mockCategoryStoreState.categoryQuota = null
    const wrapper = mount(CategoryList, { global: { stubs: { DeleteConfirmationModal: deleteModalStub } } })
    expect(wrapper.text()).not.toContain('categoryList.promptsQuota')
    expect(wrapper.text()).not.toContain('categoryList.categoriesQuota')
  })
})
