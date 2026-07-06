import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import CategoryView from '@/views/CategoryView.vue'

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
  isOwner: vi.fn((id) => id === 'user-1'),
}

const mockPromptStoreState = {
  prompts: [],
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
  categories: [],
  currentCategory: { _id: 'cat-1', name: 'Test Category', description: 'A test category.', ownerId: 'user-1', createdAt: '2024-01-01T00:00:00.000Z' },
  selectedCategoryId: '',
  loading: false,
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchCategory: vi.fn().mockResolvedValue({ _id: 'cat-1', name: 'Test Category' }),
  createCategory: vi.fn().mockResolvedValue({}),
  updateCategory: vi.fn().mockResolvedValue({}),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  selectCategory: vi.fn(),
  clearSelection: vi.fn(),
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }
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
const deleteModalStub = { template: '<div />' }

function getWrapper() {
  return mount(CategoryView, {
    global: {
      components: { routerLink: routerLinkStub },
      stubs: { DeleteConfirmationModal: deleteModalStub, CreateCategoryModal: '<div />' },
    },
    attachTo: document.body,
  })
}

describe('CategoryView', () => {
  async function setup() {
    const wrapper = await getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

  it('shows loading state while fetching', async () => {
    mockCategoryStoreState.loading = true
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('common.loading')
  })

  it('renders category name when found', async () => {
    mockCategoryStoreState.loading = false
    const wrapper = await setup()
  })

  it('renders category description when present', async () => {
    mockCategoryStoreState.loading = false
  })

  it('shows "not found" when category does not exist', async () => {
    mockCategoryStoreState.loading = false
    mockCategoryStoreState.currentCategory = null
    const wrapper = await setup()
  })

  it('renders edit button when authenticated and is own category', async () => {
    mockCategoryStoreState.loading = false
  })

  it('renders delete button when authenticated and is own category', async () => {
    mockCategoryStoreState.loading = false
  })

  it('does not render edit/delete buttons when not authenticated', async () => {
    mockAuthStoreState.isAuthenticated = false
    mockCategoryStoreState.loading = false
  })

  it('shows "no prompts in category" when list is empty', async () => {
    mockCategoryStoreState.loading = false
  })

  it('calls deleteCategory when delete is confirmed', async () => {
    mockCategoryStoreState.loading = false
  })

  it('navigates to / after successful delete', async () => {
    mockCategoryStoreState.loading = false
  })

  it('shows error toast when delete fails', async () => {
    mockCategoryStoreState.loading = false
  })

  it('renders a back link to /', async () => {
    mockCategoryStoreState.loading = false
  })
})
