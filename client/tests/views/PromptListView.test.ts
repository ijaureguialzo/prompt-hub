import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, defineComponent } from 'vue'
import PromptListView from '@/views/PromptListView.vue'

const mockAuthStoreState = {
  token: 'test-token',
  user: { _id: 'user-1' },
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({}),
  fetchCurrentUser: vi.fn().mockResolvedValue(null),
  updateUser: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  isAuthenticated: true
}

const mockPromptStoreState = {
  prompts: [
    { _id: 'p1', title: 'Prompt One', content: 'Content one.', tags: ['tag1', 'tag2'] },
    { _id: 'p2', title: 'Prompt Two', content: 'Content two.', tags: ['tag3'] },
    {
      _id: 'p3',
      title: 'Uncategorized Prompt',
      content: 'No category.',
      tags: [],
      categoryId: null
    }
  ],
  currentPrompt: null,
  loading: false,
  loadingMore: false,
  total: 3,
  page: 1,
  filters: { q: '', categoryId: '', tags: [] },
  hasMore: false,
  fetchPrompts: vi.fn().mockResolvedValue([]),
  setFilters: vi.fn().mockResolvedValue([]),
  loadMore: vi.fn().mockResolvedValue(undefined),
  fetchPrompt: vi.fn().mockResolvedValue(null),
  createPrompt: vi.fn().mockResolvedValue({}),
  updatePrompt: vi.fn().mockResolvedValue({}),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  clearCurrent: vi.fn(),
  // Export/import flow (SPEC §2.2a)
  importEntries: [],
  importQuota: null,
  importFileName: '',
  importing: false,
  exportPrompts: vi.fn().mockResolvedValue({ count: 2 }),
  prepareImport: vi.fn().mockResolvedValue([]),
  confirmImport: vi.fn().mockResolvedValue({ created: 1, updated: 1, skipped: 0 }),
  cancelImport: vi.fn()
}

const mockCategoryStoreState = {
  categories: [{ _id: 'cat-1', name: 'Category One' }],
  currentCategory: null,
  selectedCategoryId: '',
  loading: false,
  uncategorizedCount: 1,
  totalPrompts: 3,
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategory: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn()
}

const mockUIStoreState = {
  setSuccess: vi.fn(),
  setError: vi.fn(),
  setShowCreatePromptModal: vi.fn(),
  setShowCreateCategoryModal: vi.fn(),
  setEditingCategory: vi.fn(),
  showCreatePromptModal: false,
  showCreateCategoryModal: false,
  editingCategory: null
}
const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState)
}))

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

// Stub router-link and child components.
const routerLinkStub = { template: '<a><slot /></a>' }

// Functional stub: exposes the `editing` prop and emits close on click,
// so tests can assert the store -> modal data flow.
const createCategoryModalStub = defineComponent({
  name: 'CreateCategoryModal',
  props: { editing: { type: Object, default: null } },
  emits: ['close'],
  template:
    '<div class="cat-modal" @click="$emit(\'close\')">{{ editing ? editing.name : \'new\' }}</div>'
})

// Stub with buttons so tests can drive the confirm/close contract.
const importModalStub = defineComponent({
  name: 'ImportPromptsModal',
  emits: ['close', 'confirm'],
  template:
    '<div class="import-modal"><button class="stub-confirm" @click="$emit(\'confirm\', [1])"/><button class="stub-close" @click="$emit(\'close\')"/></div>'
})

function getWrapper() {
  return mount(PromptListView, {
    global: {
      components: { routerLink: routerLinkStub },
      stubs: {
        CategoryList: '<div><h2>Categories</h2></div>',
        PromptCard: '<div class="prompt-card"><slot /></div>',
        CreatePromptModal: '<div />',
        CreateCategoryModal: createCategoryModalStub,
        ImportPromptsModal: importModalStub
      }
    },
    attachTo: document.body
  })
}

describe('PromptListView', () => {
  it('shows loading state while fetching', async () => {
    mockPromptStoreState.loading = true
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('promptList.loading')
  })

  it('renders the heading', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders a New Prompt button when authenticated', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders a New Category button when authenticated', async () => {
    mockPromptStoreState.loading = false
  })

  it('does not render action buttons when not authenticated', async () => {
    mockPromptStoreState.loading = false
    mockAuthStoreState.isAuthenticated = false
  })

  it('shows "no prompts found" when filtered list is empty', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders PromptCard components for each prompt', async () => {
    mockPromptStoreState.loading = false
  })

  it('filters prompts by search query', async () => {
    mockPromptStoreState.loading = false
  })

  it('selects a category when filterByCategory event is received', async () => {
    mockPromptStoreState.loading = false
  })

  it('adds a tag to selectedTags when filterByTag event is received', async () => {
    mockPromptStoreState.loading = false
  })

  it('removes a tag from selectedTags when clicking an active tag', async () => {
    mockPromptStoreState.loading = false
  })

  it('clears all selected tags when clear all is clicked', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders a tag filter bar when selectedTags is not empty', async () => {
    mockPromptStoreState.loading = false
  })

  it('calls fetchPrompts and fetchCategories on mount', async () => {
    mockPromptStoreState.loading = false
  })

  it('shows error toast when fetch fails', async () => {
    mockPromptStoreState.loading = false
  })
})

describe('PromptListView — category edit flow (UI store contract)', () => {
  // The shared mock is module-scoped: reset the modal state so these
  // tests don't leak the stub into the other (placeholder) tests.
  function resetModalState() {
    mockUIStoreState.showCreateCategoryModal = false
    mockUIStoreState.editingCategory = null
    vi.mocked(mockUIStoreState.setShowCreateCategoryModal).mockClear()
    vi.mocked(mockUIStoreState.setEditingCategory).mockClear()
    vi.mocked(mockCategoryStoreState.fetchCategories).mockClear()
  }

  beforeEach(() => {
    resetModalState()
    mockPromptStoreState.loading = false
  })

  it('passes the category from uiStore.editingCategory into the modal', async () => {
    const cat = { _id: 'cat-1', name: 'Category One' }
    mockUIStoreState.editingCategory = cat
    mockUIStoreState.showCreateCategoryModal = true

    const wrapper = getWrapper()
    await nextTick()

    const modal = wrapper.findComponent(createCategoryModalStub)
    expect(modal.exists()).toBe(true)
    expect(modal.props('editing')).toEqual(cat)

    resetModalState()
    wrapper.unmount()
  })

  it('closing the modal clears the editing state and refetches categories', async () => {
    mockUIStoreState.editingCategory = { _id: 'cat-1', name: 'Category One' }
    mockUIStoreState.showCreateCategoryModal = true

    const wrapper = getWrapper()
    await nextTick()

    const modal = wrapper.findComponent(createCategoryModalStub)
    expect(modal.exists()).toBe(true)
    await modal.trigger('click') // the stub emits close

    expect(mockUIStoreState.setShowCreateCategoryModal).toHaveBeenCalledWith(false)
    expect(mockUIStoreState.setEditingCategory).toHaveBeenCalledWith(null)
    expect(mockCategoryStoreState.fetchCategories).toHaveBeenCalled()

    resetModalState()
    wrapper.unmount()
  })
})

describe('PromptListView — export / import (SPEC §2.2a)', () => {
  // jsdom has no DataTransfer, so set input.files directly.
  function attachFile(input: HTMLInputElement, file: File) {
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
  }

  function resetFlowState() {
    vi.mocked(mockPromptStoreState.exportPrompts).mockClear()
    vi.mocked(mockPromptStoreState.prepareImport).mockClear()
    vi.mocked(mockPromptStoreState.confirmImport).mockClear()
    vi.mocked(mockPromptStoreState.cancelImport).mockClear()
    vi.mocked(mockUIStoreState.setSuccess).mockClear()
    vi.mocked(mockUIStoreState.setError).mockClear()
  }

  beforeEach(() => {
    resetFlowState()
    // The shared module-scoped mocks are mutated by earlier (placeholder)
    // tests; restore the state this block depends on.
    mockAuthStoreState.isAuthenticated = true
    mockPromptStoreState.loading = false
  })

  it('renders Export and Import buttons when authenticated', async () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('promptList.exportBtn')
    expect(wrapper.text()).toContain('promptList.importBtn')
    // hidden file input drives the import flow
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('clicking Export calls the store and toasts the result', async () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('button')
    const exportBtn = buttons.find((b) => b.text().trim() === 'promptList.exportBtn')!
    await exportBtn.trigger('click')
    await nextTick()

    expect(mockPromptStoreState.exportPrompts).toHaveBeenCalledTimes(1)
    expect(mockUIStoreState.setSuccess).toHaveBeenCalledWith(
      expect.stringContaining('exportSuccess')
    )
  })

  it('clicking Import opens the hidden file input', async () => {
    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(input.element as HTMLInputElement, 'click')

    const buttons = wrapper.findAll('button')
    const importBtn = buttons.find((b) => b.text().trim() === 'promptList.importBtn')!
    await importBtn.trigger('click')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    clickSpy.mockRestore()
  })

  it('selecting a file prepares the import and opens the modal', async () => {
    mockPromptStoreState.prepareImport.mockResolvedValueOnce([
      { index: 0, title: 'Fresh', status: 'new', selected: true }
    ])
    mockPromptStoreState.importFileName = 'backup.zip'

    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    const file = new File(['{}'], 'backup.zip')
    attachFile(input.element as HTMLInputElement, file)
    await input.trigger('change')
    await nextTick()

    expect(mockPromptStoreState.prepareImport).toHaveBeenCalledWith(file)
    expect(wrapper.findComponent(importModalStub).exists()).toBe(true)
  })

  it('confirming the import toasts the summary and refetches the list', async () => {
    mockPromptStoreState.prepareImport.mockResolvedValueOnce([
      { index: 0, title: 'Fresh', status: 'new', selected: true }
    ])

    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    attachFile(input.element as HTMLInputElement, new File(['{}'], 'backup.zip'))
    await input.trigger('change')
    await nextTick()

    const modal = wrapper.findComponent(importModalStub)
    await modal.find('.stub-confirm').trigger('click')
    await nextTick()

    expect(mockPromptStoreState.confirmImport).toHaveBeenCalledWith([1])
    expect(mockUIStoreState.setSuccess).toHaveBeenCalledWith(
      expect.stringContaining('importSuccess')
    )
    // the modal is closed and the list reconciled
    expect(wrapper.findComponent(importModalStub).exists()).toBe(false)
    expect(mockPromptStoreState.setFilters).toHaveBeenCalled()
  })

  it('a confirm failure keeps the modal open and toasts the error', async () => {
    mockPromptStoreState.prepareImport.mockResolvedValueOnce([
      { index: 0, title: 'Fresh', status: 'new', selected: true }
    ])
    mockPromptStoreState.confirmImport.mockRejectedValueOnce(new Error('boom'))

    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    attachFile(input.element as HTMLInputElement, new File(['{}'], 'backup.zip'))
    await input.trigger('change')
    await nextTick()

    const modal = wrapper.findComponent(importModalStub)
    await modal.find('.stub-confirm').trigger('click')
    await nextTick()

    expect(mockUIStoreState.setError).toHaveBeenCalledWith('boom')
    expect(wrapper.findComponent(importModalStub).exists()).toBe(true)
  })

  it('cancelling the import clears the store state', async () => {
    mockPromptStoreState.prepareImport.mockResolvedValueOnce([
      { index: 0, title: 'Fresh', status: 'new', selected: true }
    ])

    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    attachFile(input.element as HTMLInputElement, new File(['{}'], 'backup.zip'))
    await input.trigger('change')
    await nextTick()

    await wrapper.findComponent(importModalStub).find('.stub-close').trigger('click')
    await nextTick()

    expect(mockPromptStoreState.cancelImport).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(importModalStub).exists()).toBe(false)
  })

  it('toasts a localized error when the file cannot be read', async () => {
    const fileError = new Error('english details')
    ;(fileError as Error & { name: string }).name = 'ImportFileError'
    mockPromptStoreState.prepareImport.mockRejectedValueOnce(fileError)

    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    attachFile(input.element as HTMLInputElement, new File(['nope'], 'backup.zip'))
    await input.trigger('change')
    await nextTick()

    expect(mockUIStoreState.setError).toHaveBeenCalledWith(
      expect.stringContaining('importFileError')
    )
    expect(wrapper.findComponent(importModalStub).exists()).toBe(false)
  })

  it('toasts the too-large message for an oversized file', async () => {
    const fileError = new Error('english details')
    ;(fileError as Error & { name: string; code: string }).name = 'ImportFileError'
    ;(fileError as Error & { code: string }).code = 'TOO_LARGE'
    mockPromptStoreState.prepareImport.mockRejectedValueOnce(fileError)

    const wrapper = getWrapper()
    const input = wrapper.find('input[type="file"]')
    attachFile(input.element as HTMLInputElement, new File(['nope'], 'backup.zip'))
    await input.trigger('change')
    await nextTick()

    expect(mockUIStoreState.setError).toHaveBeenCalledWith(
      expect.stringContaining('importFileTooLarge')
    )
    expect(wrapper.findComponent(importModalStub).exists()).toBe(false)
  })
})
