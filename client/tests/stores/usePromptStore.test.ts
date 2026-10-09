import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePromptStore } from '@/stores/usePromptStore'

vi.mock('@/api/index.js', () => ({
  promptsApi: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi
      .fn()
      .mockResolvedValue({ _id: 'prompt-1', title: 'Test Prompt', content: 'Content here' }),
    create: vi.fn().mockResolvedValue({ _id: 'prompt-new', title: 'New Prompt' }),
    update: vi.fn().mockResolvedValue({ _id: 'prompt-1', title: 'Updated Prompt' }),
    delete: vi.fn().mockResolvedValue({})
  }
}))

function createStoresAndSetActive() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

function getPromptStore() {
  const store = usePromptStore()
  return store
}

describe('usePromptStore', () => {
  beforeEach(() => {
    createStoresAndSetActive()
  })

  // --- fetchPrompts() ---

  it('fetchPrompts() stores results in state.prompts', async () => {
    const store = getPromptStore()
    const mockPrompts = [
      { _id: 'p1', title: 'P1' },
      { _id: 'p2', title: 'P2' }
    ]
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockPrompts)
    await store.fetchPrompts()
    expect(store.prompts).toEqual(mockPrompts)
  })

  it('fetchPrompts() calls promptsApi.getAll', async () => {
    const store = getPromptStore()
    await store.fetchPrompts()
    const { promptsApi } = await import('@/api/index.js')
    expect(promptsApi.getAll).toHaveBeenCalled()
  })

  // --- fetchPrompt() ---

  it('fetchPrompt() stores result in state.currentPrompt', async () => {
    const store = getPromptStore()
    await store.fetchPrompt('prompt-1')
    expect(store.currentPrompt?._id).toBe('prompt-1')
  })

  it('fetchPrompt() calls promptsApi.getById with the id', async () => {
    const store = getPromptStore()
    await store.fetchPrompt('prompt-1')
    const { promptsApi } = await import('@/api/index.js')
    expect(promptsApi.getById).toHaveBeenCalledWith('prompt-1')
  })

  it('fetchPrompt() returns the prompt', async () => {
    const store = getPromptStore()
    const result = await store.fetchPrompt('prompt-1')
    expect(result?._id).toBe('prompt-1')
  })

  // --- createPrompt() ---

  it('createPrompt() prepends the new prompt to state', async () => {
    const store = getPromptStore()
    await store.createPrompt({ title: 'New Prompt', content: 'Content' })
    expect(store.prompts[0]?.title).toBe('New Prompt')
  })

  it('createPrompt() calls promptsApi.create with the data', async () => {
    const store = getPromptStore()
    await store.createPrompt({ title: 'New Prompt', content: 'Content' })
    const { promptsApi } = await import('@/api/index.js')
    expect(promptsApi.create).toHaveBeenCalledWith({ title: 'New Prompt', content: 'Content' })
  })

  // --- updatePrompt() ---

  it('updatePrompt() replaces the prompt in state by id', async () => {
    const store = getPromptStore()
    store.prompts = [{ _id: 'prompt-1', title: 'Old Title' }]
    await store.updatePrompt('prompt-1', { title: 'Updated Prompt' })
    expect(store.prompts[0].title).toBe('Updated Prompt')
  })

  it('updatePrompt() updates currentPrompt when its id matches', async () => {
    const store = getPromptStore()
    store.currentPrompt = { _id: 'prompt-1', title: 'Old' }
    await store.updatePrompt('prompt-1', { title: 'Updated Prompt' })
    expect(store.currentPrompt?.title).toBe('Updated Prompt')
  })

  it('updatePrompt() does not update currentPrompt for a different id', async () => {
    const store = getPromptStore()
    store.currentPrompt = { _id: 'other-prompt', title: 'Other' }
    await store.updatePrompt('prompt-1', { title: 'Updated Prompt' })
    expect(store.currentPrompt?.title).toBe('Other')
  })

  it('updatePrompt() calls promptsApi.update with id and data', async () => {
    const store = getPromptStore()
    await store.updatePrompt('prompt-1', { title: 'Updated Prompt' })
    const { promptsApi } = await import('@/api/index.js')
    expect(promptsApi.update).toHaveBeenCalledWith('prompt-1', { title: 'Updated Prompt' })
  })

  // --- deletePrompt() ---

  it('deletePrompt() removes the prompt from state', async () => {
    const store = getPromptStore()
    store.prompts = [{ _id: 'prompt-1' }, { _id: 'prompt-2' }]
    await store.deletePrompt('prompt-1')
    expect(store.prompts).toHaveLength(1)
    expect(store.prompts[0]._id).toBe('prompt-2')
  })

  it('deletePrompt() calls promptsApi.delete with the id', async () => {
    const store = getPromptStore()
    await store.deletePrompt('prompt-1')
    const { promptsApi } = await import('@/api/index.js')
    expect(promptsApi.delete).toHaveBeenCalledWith('prompt-1')
  })

  it('deletePrompt() clears currentPrompt when its id matches', async () => {
    const store = getPromptStore()
    store.currentPrompt = { _id: 'prompt-1' }
    await store.deletePrompt('prompt-1')
    expect(store.currentPrompt).toBeNull()
  })

  it('deletePrompt() does not clear currentPrompt for a different id', async () => {
    const store = getPromptStore()
    store.currentPrompt = { _id: 'other-prompt' }
    await store.deletePrompt('prompt-1')
    expect(store.currentPrompt?._id).toBe('other-prompt')
  })

  // --- clearCurrent() ---

  it('clearCurrent() sets currentPrompt to null', () => {
    const store = getPromptStore()
    store.currentPrompt = { _id: 'prompt-1' }
    store.clearCurrent()
    expect(store.currentPrompt).toBeNull()
  })
})
