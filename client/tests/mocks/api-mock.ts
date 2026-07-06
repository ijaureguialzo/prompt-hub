import { vi } from 'vitest'

/**
 * Creates a mock API module with all standard CRUD operations.
 * Each function defaults to returning an empty Promise resolved value.
 */
export function createMockApi() {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  }
}

/** Returns a full API mock object with all endpoints. */
export function createFullApiMock() {
  return {
    promptsApi: createMockApi(),
    categoriesApi: createMockApi(),
    authApi: {
      register: vi.fn().mockResolvedValue({ token: 'fake-token', user: {} }),
      login: vi.fn().mockResolvedValue({ token: 'fake-token', user: {} }),
      getCurrentUser: vi.fn().mockResolvedValue({ user: {} }),
    },
    usersApi: createMockApi(),
    siteConfigApi: {
      getPublicConfig: vi.fn().mockResolvedValue({ registrationEnabled: true }),
      getConfig: vi.fn().mockResolvedValue({ registrationEnabled: true }),
      updateConfig: vi.fn().mockResolvedValue({}),
    },
  }
}
