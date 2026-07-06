import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})

// Mock clipboard API
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  },
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

// Mock window.location — save original descriptor to restore after tests.
const originalLocation = Object.getOwnPropertyDescriptor(window, 'location')
const mockLocation: Record<string, unknown> = { pathname: '/', href: 'http://localhost/' }
Object.defineProperty(window, 'location', {
  get: () => mockLocation,
  configurable: true,
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Reset localStorage mock internal state
  ;(window.localStorage as any).mockClear?.()
})
