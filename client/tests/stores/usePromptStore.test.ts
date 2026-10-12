import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePromptStore } from '@/stores/usePromptStore'

vi.mock('@/api/index.js', () => ({
  promptsApi: {
    getAll: vi
      .fn()
      .mockResolvedValue({ prompts: [], total: 0, page: 1, limit: 50, hasMore: false }),
    getById: vi
      .fn()
      .mockResolvedValue({ _id: 'prompt-1', title: 'Test Prompt', content: 'Content here' }),
    create: vi.fn().mockResolvedValue({ _id: 'prompt-new', title: 'New Prompt' }),
    update: vi.fn().mockResolvedValue({ _id: 'prompt-1', title: 'Updated Prompt' }),
    delete: vi.fn().mockResolvedValue({}),
    export: vi.fn().mockResolvedValue({
      format: 'prompthub-export',
      version: 1,
      exportedAt: '2025-01-01T00:00:00.000Z',
      exporter: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      prompts: [
        {
          id: 'prompt-1',
          clientId: 'uuid-1',
          title: 'Test Prompt',
          content: 'Content here',
          categoryId: null,
          categoryName: null,
          tags: [],
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ]
    }),
    import: vi.fn().mockResolvedValue({})
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
    ;(promptsApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      prompts: mockPrompts,
      total: 2,
      page: 1,
      limit: 50,
      hasMore: false
    })
    await store.fetchPrompts()
    expect(store.prompts).toEqual(mockPrompts)
    expect(store.total).toBe(2)
    expect(store.hasMore).toBe(false)
  })

  it('fetchPrompts() forwards the current filters to the API', async () => {
    const store = getPromptStore()
    store.filters = { q: 'needle', categoryId: 'cat-9', tags: ['a', 'b'] }
    await store.fetchPrompts()
    const { promptsApi } = await import('@/api/index.js')
    expect(promptsApi.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'needle', categoryId: 'cat-9', tag: ['a', 'b'] }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('setFilters() replaces the filters and refetches from page 1', async () => {
    const store = getPromptStore()
    store.page = 3
    store.prompts = [{ _id: 'old' }]
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      prompts: [{ _id: 'fresh' }],
      total: 1,
      page: 1,
      limit: 50,
      hasMore: false
    })

    await store.setFilters({ q: 'x' })

    expect(store.filters.q).toBe('x')
    expect(store.filters.categoryId).toBe('')
    expect(store.page).toBe(1)
    expect(store.prompts.map((p) => p._id)).toEqual(['fresh'])
    expect(promptsApi.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, q: 'x' }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('loadMore() appends the next page and advances the page counter', async () => {
    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.getAll as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        prompts: [{ _id: 'p1' }],
        total: 3,
        page: 1,
        limit: 50,
        hasMore: true
      })
      .mockResolvedValueOnce({
        prompts: [{ _id: 'p2' }, { _id: 'p3' }],
        total: 3,
        page: 2,
        limit: 50,
        hasMore: false
      })

    await store.fetchPrompts()
    expect(store.hasMore).toBe(true)
    await store.loadMore()
    expect(store.prompts.map((p) => p._id)).toEqual(['p1', 'p2', 'p3'])
    expect(store.hasMore).toBe(false)
  })

  it('loadMore() is a no-op when there is no more data', async () => {
    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.getAll as ReturnType<typeof vi.fn>).mockClear()
    await store.fetchPrompts()
    await store.loadMore()
    // Only the initial fetch should have hit the API
    expect(promptsApi.getAll).toHaveBeenCalledTimes(1)
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

  // --- exportPrompts() (SPEC §2.2a) ---

  it('exportPrompts() downloads the zip and returns the count', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const store = getPromptStore()
    const result = await store.exportPrompts()

    expect(result.count).toBe(1)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('exportPrompts() returns count 0 without downloading for an empty account', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })

    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.export as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      format: 'prompthub-export',
      version: 1,
      prompts: []
    })

    const result = await store.exportPrompts()
    expect(result.count).toBe(0)
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  // --- prepareImport() (SPEC §2.2a) ---

  it('prepareImport() parses the file, merges the dry run and stores rows', async () => {
    const payload = {
      format: 'prompthub-export',
      version: 1,
      prompts: [
        { clientId: 'uuid-1', title: 'Mine', content: 'old' },
        { clientId: 'uuid-2', title: 'Fresh', content: 'new' }
      ]
    }
    const file = new File([JSON.stringify(payload)], 'backup.json')

    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.import as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      dryRun: true,
      results: [
        { index: 0, status: 'conflict', existingId: 'p-existing', existingTitle: 'Mine' },
        { index: 1, status: 'new', existingId: null, existingTitle: null }
      ],
      quota: { used: 1, limit: 200, wouldUse: 2, exceeded: false }
    })

    await store.prepareImport(file)

    // dry run sent only the entry fields
    expect(promptsApi.import).toHaveBeenCalledWith({
      dryRun: true,
      prompts: [
        {
          clientId: 'uuid-1',
          title: 'Mine',
          content: 'old',
          tags: [],
          categoryId: null,
          categoryName: null,
          createdAt: null,
          updatedAt: null
        },
        {
          clientId: 'uuid-2',
          title: 'Fresh',
          content: 'new',
          tags: [],
          categoryId: null,
          categoryName: null,
          createdAt: null,
          updatedAt: null
        }
      ]
    })

    expect(store.importFileName).toBe('backup.json')
    expect(store.importQuota).toEqual({ used: 1, limit: 200, wouldUse: 2, exceeded: false })
    expect(store.importEntries).toHaveLength(2)
    // The server's "conflict" is surfaced as "exists", unselected by default.
    expect(store.importEntries[0]).toMatchObject({
      status: 'exists',
      selected: false,
      existingId: 'p-existing'
    })
    expect(store.importEntries[1]).toMatchObject({ status: 'new', selected: true })
  })

  it('prepareImport() carries the server categoryResolved flag into the rows', async () => {
    const payload = {
      format: 'prompthub-export',
      version: 1,
      prompts: [
        { clientId: 'uuid-9', title: 'Categorized', content: 'c', categoryName: 'Known' },
        { clientId: 'uuid-10', title: 'Orphaned', content: 'c', categoryName: 'Foreign' }
      ]
    }
    const file = new File([JSON.stringify(payload)], 'backup.json')

    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.import as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      dryRun: true,
      results: [
        {
          index: 0,
          status: 'new',
          existingId: null,
          existingTitle: null,
          categoryResolved: true,
          categoryWillBeCreated: false
        },
        {
          index: 1,
          status: 'new',
          existingId: null,
          existingTitle: null,
          categoryResolved: true,
          categoryWillBeCreated: true
        }
      ],
      quota: { used: 0, limit: 200, wouldUse: 2, exceeded: false },
      categories: { toCreate: ['Foreign'] }
    })

    await store.prepareImport(file)

    expect(store.importEntries[0].categoryResolved).toBe(true)
    expect(store.importEntries[0].categoryWillBeCreated).toBe(false)
    // The row keeps its file category name so the modal can name it in the hint.
    expect(store.importEntries[1]).toMatchObject({
      categoryName: 'Foreign',
      categoryResolved: true,
      categoryWillBeCreated: true
    })
    expect(store.importCategories).toEqual({ toCreate: ['Foreign'] })
  })

  it('prepareImport() rejects a malformed file without touching the API', async () => {
    const file = new File(['not json'], 'backup.json')
    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.import as ReturnType<typeof vi.fn>).mockClear()

    await expect(store.prepareImport(file)).rejects.toThrow()
    expect(promptsApi.import).not.toHaveBeenCalled()
  })

  // --- confirmImport() (SPEC §2.2a) ---

  it('confirmImport() remaps conflict indices to the valid-only array', async () => {
    const payload = {
      format: 'prompthub-export',
      version: 1,
      prompts: [
        { title: 'Broken', content: '' }, // invalid locally: never sent (index 0)
        { clientId: 'uuid-1', title: 'Mine', content: 'old' }, // conflict (index 1)
        { clientId: 'uuid-2', title: 'Fresh', content: 'new' } // new (index 2)
      ]
    }
    const file = new File([JSON.stringify(payload)], 'backup.json')

    const store = getPromptStore()
    const { promptsApi } = await import('@/api/index.js')
    ;(promptsApi.import as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        // dry run over the 2 valid entries (sent order: Mine, Fresh)
        results: [
          { index: 0, status: 'conflict', existingId: 'p1', existingTitle: 'Mine' },
          { index: 1, status: 'new', existingId: null, existingTitle: null }
        ],
        quota: { used: 1, limit: 200, wouldUse: 2, exceeded: false }
      })
      .mockResolvedValueOnce({
        dryRun: false,
        created: 1,
        updated: 1,
        skipped: 0,
        quota: { used: 2, limit: 200 }
      })

    await store.prepareImport(file)
    // The user confirms the conflict — its index in the FULL file is 1, but
    // in the sent (valid-only) array it is 0: the remapping must handle that.
    await store.confirmImport([1])

    const calls = (promptsApi.import as ReturnType<typeof vi.fn>).mock.calls
    const applyCall = calls[calls.length - 1][0] as {
      dryRun: boolean
      overwrites: number[]
      prompts: { title: string }[]
    }
    expect(applyCall.dryRun).toBe(false)
    expect(applyCall.overwrites).toEqual([0])
    expect(applyCall.prompts.map((p) => p.title)).toEqual(['Mine', 'Fresh'])
    // success clears the flow state
    expect(store.importEntries).toEqual([])
  })

  it('cancelImport() resets the flow state', async () => {
    const store = getPromptStore()
    store.importEntries = [{ index: 0, title: 'X', status: 'new', selected: true }]
    store.importQuota = { used: 1, limit: 200, wouldUse: 1, exceeded: false }
    store.importFileName = 'backup.zip'
    store.importing = true

    store.cancelImport()

    expect(store.importEntries).toEqual([])
    expect(store.importQuota).toBeNull()
    expect(store.importFileName).toBe('')
    expect(store.importing).toBe(false)
  })

  // --- List request races (PLAN.md P2/11) ---

  describe('search races (AbortController)', () => {
    it('drops the late response of a superseded search', async () => {
      const store = getPromptStore()
      const { promptsApi } = await import('@/api/index.js')
      const getAll = promptsApi.getAll as ReturnType<typeof vi.fn>

      let resolveFirst: (value: unknown) => void
      getAll
        .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
        .mockResolvedValueOnce({
          prompts: [{ _id: 'fresh' }],
          total: 1,
          page: 1,
          limit: 50,
          hasMore: false
        })

      const first = store.setFilters({ q: 'old' }) // slow, in flight
      const second = store.setFilters({ q: 'new' }) // supersedes it

      await second
      expect(store.prompts.map((p) => p._id)).toEqual(['fresh'])

      // The old response arrives late: it must not clobber the new list.
      resolveFirst!({
        prompts: [{ _id: 'stale' }],
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false
      })
      await first
      expect(store.prompts.map((p) => p._id)).toEqual(['fresh'])
      expect(store.total).toBe(1)
      expect(store.loading).toBe(false)
    })

    it('silently swallows the aborted request and keeps the newer one\u0027s state', async () => {
      const store = getPromptStore()
      const { promptsApi } = await import('@/api/index.js')
      const getAll = promptsApi.getAll as ReturnType<typeof vi.fn>

      getAll.mockImplementationOnce(
        (_params: unknown, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () =>
              reject(Object.assign(new Error('The request was aborted.'), { name: 'AbortError' }))
            )
          })
      )
      getAll.mockResolvedValueOnce({
        prompts: [{ _id: 'fresh' }],
        total: 1,
        page: 1,
        limit: 50,
        hasMore: false
      })

      const first = store.setFilters({ q: 'old' })
      const second = store.setFilters({ q: 'new' })

      await second
      // The abort rejection must resolve (not throw); the newer request's
      // result and loading flags must be untouched.
      await first
      expect(store.prompts.map((p) => p._id)).toEqual(['fresh'])
      expect(store.loading).toBe(false)
      expect(store.loadingMore).toBe(false)
    })
  })
})
