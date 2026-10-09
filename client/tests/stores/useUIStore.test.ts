import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUIStore } from '@/stores/useUIStore'

function createStoresAndSetActive() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

function getUIStore() {
  const store = useUIStore()
  return store
}

describe('useUIStore', () => {
  beforeEach(() => {
    createStoresAndSetActive()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- setError() ---

  it('setError() sets the error state', () => {
    const store = getUIStore()
    store.setError('Something went wrong')
    expect(store.error).toBe('Something went wrong')
  })

  it('setError() auto-clears error after 5 seconds', () => {
    const store = getUIStore()
    store.setError('Error message')
    expect(store.error).toBe('Error message')
    vi.advanceTimersByTime(5000)
    expect(store.error).toBeNull()
  })

  // --- setSuccess() ---

  it('setSuccess() sets the successMessage state', () => {
    const store = getUIStore()
    store.setSuccess('Operation successful')
    expect(store.successMessage).toBe('Operation successful')
  })

  it('setSuccess() auto-clears successMessage after 3 seconds', () => {
    const store = getUIStore()
    store.setSuccess('Success message')
    expect(store.successMessage).toBe('Success message')
    vi.advanceTimersByTime(3000)
    expect(store.successMessage).toBeNull()
  })

  // --- clearError() ---

  it('clearError() sets error to null immediately', () => {
    const store = getUIStore()
    store.setError('Error message')
    store.clearError()
    expect(store.error).toBeNull()
  })

  // --- setShowCreatePromptModal() ---

  it("setShowCreatePromptModal(true) sets the flag to true", () => {
    const store = getUIStore()
    store.setShowCreatePromptModal(true)
    expect(store.showCreatePromptModal).toBe(true)
  })

  it("setShowCreatePromptModal(false) sets the flag to false", () => {
    const store = getUIStore()
    store.setShowCreatePromptModal(false)
    expect(store.showCreatePromptModal).toBe(false)
  })

  // --- setShowCreateCategoryModal() ---

  it("setShowCreateCategoryModal(true) sets the flag to true", () => {
    const store = getUIStore()
    store.setShowCreateCategoryModal(true)
    expect(store.showCreateCategoryModal).toBe(true)
  })

  it("setShowCreateCategoryModal(false) sets the flag to false", () => {
    const store = getUIStore()
    store.setShowCreateCategoryModal(false)
    expect(store.showCreateCategoryModal).toBe(false)
  })

  // --- setEditingCategory() ---

  it('setEditingCategory() stores the category being edited', () => {
    const store = getUIStore()
    const cat = { _id: 'cat-9', name: 'To Edit' }
    store.setEditingCategory(cat)
    // Pinia wraps stored objects in a reactive proxy, so compare by value
    expect(store.editingCategory).toEqual(cat)
  })

  it('setEditingCategory(null) clears the editing state', () => {
    const store = getUIStore()
    store.setEditingCategory({ _id: 'cat-9' })
    store.setEditingCategory(null)
    expect(store.editingCategory).toBeNull()
  })

  // --- initial state ---

  it('initializes with all null/false values', () => {
    const store = getUIStore()
    expect(store.error).toBeNull()
    expect(store.successMessage).toBeNull()
    expect(store.showCreatePromptModal).toBe(false)
    expect(store.showCreateCategoryModal).toBe(false)
    expect(store.editingCategory).toBeNull()
  })
})
