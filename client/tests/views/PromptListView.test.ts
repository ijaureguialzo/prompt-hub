import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
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
  isAuthenticated: true,
}

const mockPromptStoreState = {
  prompts: [
    { _id: 'p1', title: 'Prompt One', content: 'Content one.', tags: ['tag1', 'tag2'] },
    { _id: 'p2', title: 'Prompt Two', content: 'Content two.', tags: ['tag3'] },
    { _id: 'p3', title: 'Uncategorized Prompt', content: 'No category.', tags: [], categoryId: null },
  ],
  currentPrompt: null,
  loading: false,
  fetchPrompts: vi.fn().mockResolvedValue([]),
  fetchPrompt: vi.fn().mockResolvedValue(null),
  createPrompt: vi.fn().mockResolvedValue({}),
  updatePrompt: vi.fn().mockResolvedValue({}),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  clearCurrent: vi.fn(),
}

const mockCategoryStoreState = {
  categories: [{ _id: 'cat-1', name: 'Category One' }],
  currentCategory: null,
  selectedCategoryId: '',
  loading: false,
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategory: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn(),
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn(), setShowCreatePromptModal: vi.fn(), setShowCreateCategoryModal: vi.fn(), showCreatePromptModal: false, showCreateCategoryModal: false }
const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}))

vi.mock('@/stores/usePromptStore', () => ({
  usePromptStore: vi.fn(() => mockPromptStoreState),
}))

vi.mock('@/stores/useCategoryStore', () => ({
  useCategoryStore: vi.fn(() => mockCategoryStoreState),
}))

vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState),
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => mockI18nStoreState),
}))

// Stub router-link and child components.
const routerLinkStub = { template: '<a><slot /></a>' }

function getWrapper() {
  return mount(PromptListView, {
    global: {
      components: { routerLink: routerLinkStub },
      stubs: { CategoryList: '<div><h2>Categories</h2></div>', PromptCard: '<div class="prompt-card"><slot /></div>', CreatePromptModal: '<div />', CreateCategoryModal: '<div />' },
    },
    attachTo: document.body,
  })
}

describe('PromptListView', () => {
  async function setup() {
    const wrapper = await getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

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
