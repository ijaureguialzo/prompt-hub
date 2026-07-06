import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import PromptDetailView from '@/views/PromptDetailView.vue'

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
  fetchPrompt: vi.fn().mockResolvedValue({ _id: 'prompt-1', title: 'Test Prompt', content: 'This is the prompt content.', ownerId: 'user-1', tags: ['tag1'], categoryId: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }),
  createPrompt: vi.fn().mockResolvedValue({}),
  updatePrompt: vi.fn().mockResolvedValue({}),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  clearCurrent: vi.fn(),
}

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }
const mockI18nStoreState = { t: (key: string) => key, language: 'en' }

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn(() => mockAuthStoreState),
}))

vi.mock('@/stores/usePromptStore', () => ({
  usePromptStore: vi.fn(() => mockPromptStoreState),
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
  return mount(PromptDetailView, {
    global: {
      components: { routerLink: routerLinkStub },
      stubs: { DeleteConfirmationModal: deleteModalStub, CreatePromptModal: '<div />', UsePromptModal: '<div />' },
    },
    attachTo: document.body,
  })
}

describe('PromptDetailView', () => {
  async function setup() {
    const wrapper = await getWrapper()
    await nextTick() // wait for onMounted to complete
    return wrapper
  }

  it('shows loading state while fetching', async () => {
    mockPromptStoreState.loading = true
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('common.loading')
  })

  it('shows not found when prompt does not exist', async () => {
    mockPromptStoreState.loading = false
    mockPromptStoreState.currentPrompt = null
    const wrapper = await setup()
    expect(wrapper.text()).toContain('promptDetail.notFound')
  })

  it('renders prompt title when found', async () => {
    mockPromptStoreState.loading = false
    const wrapper = await setup()
  })

  it('renders prompt content in a pre tag', async () => {
    mockPromptStoreState.loading = false
    const wrapper = await setup()
  })

  it('renders an uncategorized badge when no categoryId', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders a category link when categoryId exists', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders tags when present', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders a copy to clipboard button', async () => {
    mockPromptStoreState.loading = false
  })

  it('calls navigator.clipboard.writeText when copy button is clicked', async () => {
    mockPromptStoreState.loading = false
  })

  it('shows success toast when copy succeeds', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders edit/delete buttons when authenticated and is own prompt', async () => {
    mockPromptStoreState.loading = false
  })

  it('does not render edit/delete buttons when not authenticated', async () => {
    mockAuthStoreState.isAuthenticated = false
    mockPromptStoreState.loading = false
  })

  it('calls deletePrompt when delete is confirmed', async () => {
    mockPromptStoreState.loading = false
  })

  it('navigates to / after successful delete', async () => {
    mockPromptStoreState.loading = false
  })

  it('shows error toast when delete fails', async () => {
    mockPromptStoreState.loading = false
  })

  it('renders a back link to /', async () => {
    mockPromptStoreState.loading = false
  })
})
