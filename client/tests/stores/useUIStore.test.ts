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

  // --- setError() / queue ---

  it('setError() appends an error toast to the queue', () => {
    const store = getUIStore()
    store.setError('Something went wrong')
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]).toMatchObject({ type: 'error', message: 'Something went wrong' })
  })

  it('setError() toasts expire independently after 5 seconds', () => {
    const store = getUIStore()
    store.setError('First error')
    vi.advanceTimersByTime(2000)
    store.setError('Second error') // arrives while the first is still live

    // Regression (PLAN.md P2/12): the first toast's clock must not kill
    // the second — each entry owns its own timer.
    vi.advanceTimersByTime(3000) // t = 5000: first expires only
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Second error')

    vi.advanceTimersByTime(2000) // t = 7000: second expires too
    expect(store.toasts).toHaveLength(0)
  })

  // --- setSuccess() / queue ---

  it('setSuccess() appends a success toast to the queue', () => {
    const store = getUIStore()
    store.setSuccess('Operation successful')
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]).toMatchObject({ type: 'success', message: 'Operation successful' })
  })

  it('success toasts expire after 3 seconds, independently of errors', () => {
    const store = getUIStore()
    store.setError('long-lived error')
    store.setSuccess('short success')

    vi.advanceTimersByTime(3000)
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].type).toBe('error')

    vi.advanceTimersByTime(2000)
    expect(store.toasts).toHaveLength(0)
  })

  // --- clearError() ---

  it('clearError() removes error toasts (and only errors) immediately', () => {
    const store = getUIStore()
    store.setError('Error message')
    store.setSuccess('Still fine')
    store.clearError()
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].type).toBe('success')
  })

  it('a timer for an already-removed toast is a safe no-op', () => {
    const store = getUIStore()
    store.setError('Doomed')
    store.clearError()
    vi.advanceTimersByTime(5000)
    expect(store.toasts).toHaveLength(0)
  })

  // --- setShowCreatePromptModal() ---

  it('setShowCreatePromptModal(true) sets the flag to true', () => {
    const store = getUIStore()
    store.setShowCreatePromptModal(true)
    expect(store.showCreatePromptModal).toBe(true)
  })

  it('setShowCreatePromptModal(false) sets the flag to false', () => {
    const store = getUIStore()
    store.setShowCreatePromptModal(false)
    expect(store.showCreatePromptModal).toBe(false)
  })

  // --- setShowCreateCategoryModal() ---

  it('setShowCreateCategoryModal(true) sets the flag to true', () => {
    const store = getUIStore()
    store.setShowCreateCategoryModal(true)
    expect(store.showCreateCategoryModal).toBe(true)
  })

  it('setShowCreateCategoryModal(false) sets the flag to false', () => {
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

  it('initializes with an empty queue and all flags off', () => {
    const store = getUIStore()
    expect(store.toasts).toEqual([])
    expect(store.showCreatePromptModal).toBe(false)
    expect(store.showCreateCategoryModal).toBe(false)
    expect(store.editingCategory).toBeNull()
  })
})
