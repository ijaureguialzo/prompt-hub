import { vi } from 'vitest'

/** Creates a mock auth store with all state and actions. */
export function createMockAuthStore(overrides: Record<string, unknown> = {}) {
  return {
    token: 'fake-jwt-token',
    user: { _id: 'user-1', email: 'test@example.com', role: 'admin' as const },
    loading: false,
    isAuthenticated: true,
    isAdmin: true,
    isOwner: vi.fn(() => false),
    login: vi.fn().mockResolvedValue({
      token: 'fake-jwt-token',
      user: { _id: 'user-1', email: 'test@example.com', role: 'admin' as const }
    }),
    register: vi.fn().mockResolvedValue({
      token: 'fake-jwt-token',
      user: { _id: 'user-1', email: 'test@example.com', role: 'admin' as const }
    }),
    fetchCurrentUser: vi.fn().mockResolvedValue({
      user: { _id: 'user-1', email: 'test@example.com', role: 'admin' as const }
    }),
    updateUser: vi.fn().mockResolvedValue(undefined),
    updateMe: vi
      .fn()
      .mockResolvedValue({ _id: 'user-1', email: 'test@example.com', role: 'admin' as const }),
    logout: vi.fn(),
    init: vi.fn(),
    ...overrides
  }
}

/** Creates a mock prompt store with all state and actions. */
export function createMockPromptStore(overrides: Record<string, unknown> = {}) {
  return {
    prompts: [],
    currentPrompt: null,
    loading: false,
    fetchPrompts: vi.fn().mockResolvedValue([]),
    fetchPrompt: vi.fn().mockResolvedValue(null),
    createPrompt: vi.fn().mockResolvedValue({}),
    updatePrompt: vi.fn().mockResolvedValue({}),
    deletePrompt: vi.fn().mockResolvedValue(undefined),
    clearCurrent: vi.fn(),
    ...overrides
  }
}

/** Creates a mock category store with all state and actions. */
export function createMockCategoryStore(overrides: Record<string, unknown> = {}) {
  return {
    categories: [],
    currentCategory: null,
    selectedCategoryId: null,
    loading: false,
    selectedCategory: null,
    fetchCategories: vi.fn().mockResolvedValue([]),
    fetchCategory: vi.fn().mockResolvedValue(null),
    createCategory: vi.fn().mockResolvedValue({}),
    updateCategory: vi.fn().mockResolvedValue({}),
    deleteCategory: vi.fn().mockResolvedValue(undefined),
    selectCategory: vi.fn(),
    clearSelection: vi.fn(),
    ...overrides
  }
}

/** Creates a mock UI store with all state and actions. */
export function createMockUIStore(overrides: Record<string, unknown> = {}) {
  return {
    error: null,
    successMessage: null,
    showCreatePromptModal: false,
    showCreateCategoryModal: false,
    setError: vi.fn(),
    setSuccess: vi.fn(),
    clearError: vi.fn(),
    setShowCreatePromptModal: vi.fn(),
    setShowCreateCategoryModal: vi.fn(),
    ...overrides
  }
}

/** Creates a mock i18n store with all state and actions. */
export function createMockI18nStore(overrides: Record<string, unknown> = {}) {
  return {
    language: 'en',
    locales: { en: {}, es: {}, eu: {} },
    t: vi.fn((key: string) => key),
    currentLocale: {},
    setLanguage: vi.fn(),
    init: vi.fn(),
    ...overrides
  }
}

/** Creates a mock theme store with all state and actions. */
export function createMockThemeStore(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'auto' as const,
    _systemDark: false,
    isDark: false,
    init: vi.fn(),
    setMode: vi.fn(),
    toggleTheme: vi.fn(),
    dispose: vi.fn(),
    ...overrides
  }
}
