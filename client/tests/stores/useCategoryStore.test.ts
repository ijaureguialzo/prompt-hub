import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCategoryStore } from '@/stores/useCategoryStore'

vi.mock('@/api/index.js', () => ({
  categoriesApi: {
    getAll: vi.fn().mockResolvedValue({ categories: [], uncategorizedCount: 0, totalPrompts: 0 }),
    getById: vi
      .fn()
      .mockResolvedValue({ _id: 'cat-1', name: 'Test Category', description: 'A test category' }),
    create: vi.fn().mockResolvedValue({ _id: 'cat-new', name: 'New Category' }),
    update: vi.fn().mockResolvedValue({ _id: 'cat-1', name: 'Updated Category' }),
    delete: vi.fn().mockResolvedValue({})
  }
}))

function createStoresAndSetActive() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

function getCategoryStore() {
  const store = useCategoryStore()
  return store
}

describe('useCategoryStore', () => {
  beforeEach(() => {
    createStoresAndSetActive()
  })

  // --- fetchCategories() ---

  it('fetchCategories() stores results in state.categories', async () => {
    const store = getCategoryStore()
    const mockCategories = [
      { _id: 'c1', name: 'Cat 1' },
      { _id: 'c2', name: 'Cat 2' }
    ]
    const { categoriesApi } = await import('@/api/index.js')
    ;(categoriesApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockCategories)
    await store.fetchCategories()
    expect(store.categories).toEqual(mockCategories)
  })

  it('fetchCategories() unwraps the object shape into categories + counts', async () => {
    const store = getCategoryStore()
    const { categoriesApi } = await import('@/api/index.js')
    ;(categoriesApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      categories: [{ _id: 'c1', name: 'Cat 1', promptCount: 3 }],
      uncategorizedCount: 7,
      totalPrompts: 10,
      promptQuota: { used: 187, limit: 200 },
      categoryQuota: { used: 3, limit: 50 }
    })
    await store.fetchCategories()
    expect(store.categories).toHaveLength(1)
    expect(store.categories[0].promptCount).toBe(3)
    expect(store.uncategorizedCount).toBe(7)
    expect(store.totalPrompts).toBe(10)
    expect(store.promptQuota).toEqual({ used: 187, limit: 200 })
    expect(store.categoryQuota).toEqual({ used: 3, limit: 50 })
  })

  it('fetchCategories() calls categoriesApi.getAll', async () => {
    const store = getCategoryStore()
    await store.fetchCategories()
    const { categoriesApi } = await import('@/api/index.js')
    expect(categoriesApi.getAll).toHaveBeenCalled()
  })

  // --- fetchCategory() ---

  it('fetchCategory() stores result in state.currentCategory', async () => {
    const store = getCategoryStore()
    await store.fetchCategory('cat-1')
    expect(store.currentCategory?._id).toBe('cat-1')
  })

  it('fetchCategory() calls categoriesApi.getById with the id', async () => {
    const store = getCategoryStore()
    await store.fetchCategory('cat-1')
    const { categoriesApi } = await import('@/api/index.js')
    expect(categoriesApi.getById).toHaveBeenCalledWith('cat-1')
  })

  it('fetchCategory() returns the category', async () => {
    const store = getCategoryStore()
    const result = await store.fetchCategory('cat-1')
    expect(result?._id).toBe('cat-1')
  })

  // --- createCategory() ---

  it('createCategory() prepends the new category to state', async () => {
    const store = getCategoryStore()
    await store.createCategory({ name: 'New Category' })
    expect(store.categories[0]?.name).toBe('New Category')
  })

  it('createCategory() calls categoriesApi.create with the data', async () => {
    const store = getCategoryStore()
    await store.createCategory({ name: 'New Category' })
    const { categoriesApi } = await import('@/api/index.js')
    expect(categoriesApi.create).toHaveBeenCalledWith({ name: 'New Category' })
  })

  // --- updateCategory() ---

  it('updateCategory() replaces the category in state by id', async () => {
    const store = getCategoryStore()
    store.categories = [{ _id: 'cat-1', name: 'Old Name' }]
    await store.updateCategory('cat-1', { name: 'Updated Category' })
    expect(store.categories[0].name).toBe('Updated Category')
  })

  it('updateCategory() calls categoriesApi.update with id and data', async () => {
    const store = getCategoryStore()
    await store.updateCategory('cat-1', { name: 'Updated Category' })
    const { categoriesApi } = await import('@/api/index.js')
    expect(categoriesApi.update).toHaveBeenCalledWith('cat-1', { name: 'Updated Category' })
  })

  // --- deleteCategory() ---

  it('deleteCategory() removes the category from state', async () => {
    const store = getCategoryStore()
    store.categories = [
      { _id: 'cat-1', name: 'Cat 1' },
      { _id: 'cat-2', name: 'Cat 2' }
    ]
    await store.deleteCategory('cat-1')
    expect(store.categories).toHaveLength(1)
    expect(store.categories[0]._id).toBe('cat-2')
  })

  it('deleteCategory() calls categoriesApi.delete with the id', async () => {
    const store = getCategoryStore()
    await store.deleteCategory('cat-1')
    const { categoriesApi } = await import('@/api/index.js')
    expect(categoriesApi.delete).toHaveBeenCalledWith('cat-1')
  })

  it('deleteCategory() clears selectedCategoryId when deleted category was selected', async () => {
    const store = getCategoryStore()
    store.selectedCategoryId = 'cat-1'
    await store.deleteCategory('cat-1')
    expect(store.selectedCategoryId).toBeNull()
  })

  it('deleteCategory() does not clear selectedCategoryId for a different id', async () => {
    const store = getCategoryStore()
    store.selectedCategoryId = 'cat-2'
    await store.deleteCategory('cat-1')
    expect(store.selectedCategoryId).toBe('cat-2')
  })

  // --- selectCategory() / clearSelection() ---

  it('selectCategory() sets selectedCategoryId', () => {
    const store = getCategoryStore()
    store.selectCategory('cat-1')
    expect(store.selectedCategoryId).toBe('cat-1')
  })

  it('clearSelection() sets selectedCategoryId to null', () => {
    const store = getCategoryStore()
    store.selectedCategoryId = 'cat-1'
    store.clearSelection()
    expect(store.selectedCategoryId).toBeNull()
  })

  // --- selectedCategory getter ---

  it('selectedCategory returns the category matching selectedCategoryId', () => {
    const store = getCategoryStore()
    store.categories = [
      { _id: 'cat-1', name: 'Cat 1' },
      { _id: 'cat-2', name: 'Cat 2' }
    ]
    store.selectCategory('cat-1')
    expect(store.selectedCategory?._id).toBe('cat-1')
  })

  it('selectedCategory returns null when no category matches', () => {
    const store = getCategoryStore()
    store.categories = [{ _id: 'cat-1', name: 'Cat 1' }]
    store.selectCategory('nonexistent')
    expect(store.selectedCategory).toBeNull()
  })

  it('selectedCategory returns null when selectedCategoryId is null', () => {
    const store = getCategoryStore()
    expect(store.selectedCategory).toBeNull()
  })
})
