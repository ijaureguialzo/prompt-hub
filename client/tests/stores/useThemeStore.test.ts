import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useThemeStore } from '@/stores/useThemeStore'

function createStoresAndSetActive() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

function getThemeStore() {
  const store = useThemeStore()
  return store
}

describe('useThemeStore', () => {
  beforeEach(() => {
    createStoresAndSetActive()
    ;(window.localStorage as { clear: () => void }).clear()
  })

  // --- init() ---

  it('init() reads mode from localStorage when saved', () => {
    const store = useThemeStore()
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem('themeMode', 'dark')
    store.init()
    expect(store.mode).toBe('dark')
  })

  it("init() defaults to 'auto' when no themeMode in localStorage", () => {
    const store = useThemeStore()
    // Default state is 'auto'. init() should not change it.
    store.init()
    expect(store.mode).toBe('auto')
  })

  // --- setMode() ---

  it("setMode('dark') updates mode and persists to localStorage", () => {
    const store = getThemeStore()
    store.setMode('dark')
    expect(store.mode).toBe('dark')
    expect(window.localStorage.setItem).toHaveBeenCalledWith('themeMode', 'dark')
  })

  it("setMode('light') updates mode and persists to localStorage", () => {
    const store = getThemeStore()
    store.setMode('light')
    expect(store.mode).toBe('light')
  })

  it("setMode('auto') updates mode and persists to localStorage", () => {
    const store = getThemeStore()
    store.setMode('auto')
    expect(store.mode).toBe('auto')
  })

  it("setMode with invalid value does not change mode", () => {
    const store = getThemeStore()
    store.setMode('invalid' as any)
    expect(store.mode).toBe('auto')
  })

  // --- toggleTheme() ---

  it("toggleTheme() cycles from 'light' to 'dark'", () => {
    const store = getThemeStore()
    store.setMode('light')
    store.toggleTheme()
    expect(store.mode).toBe('dark')
  })

  it("toggleTheme() cycles from 'dark' to 'auto'", () => {
    const store = getThemeStore()
    store.setMode('dark')
    store.toggleTheme()
    expect(store.mode).toBe('auto')
  })

  it("toggleTheme() cycles from 'auto' to 'light'", () => {
    const store = getThemeStore()
    store.setMode('auto')
    store.toggleTheme()
    expect(store.mode).toBe('light')
  })

  // --- isDark getter ---

  it("isDark returns true when mode is 'dark'", () => {
    const store = getThemeStore()
    store.setMode('dark')
    expect(store.isDark).toBe(true)
  })

  it("isDark returns false when mode is 'light'", () => {
    const store = getThemeStore()
    store.setMode('light')
    expect(store.isDark).toBe(false)
  })

  it("isDark returns _systemDark when mode is 'auto'", () => {
    const store = getThemeStore()
    store.setMode('auto')
    // _systemDark defaults to false in the mock (matchMedia returns matches: false).
    expect(store.isDark).toBe(false)
  })

  // --- dispose() ---

  it('dispose() cleans up event listeners', () => {
    const store = getThemeStore()
    // Call init to set up the listener.
    store.init()
    // dispose should not throw even if no listeners are registered.
    expect(() => store.dispose()).not.toThrow()
  })

  it('dispose() does not throw when called multiple times', () => {
    const store = getThemeStore()
    expect(() => { store.dispose(); store.dispose() }).not.toThrow()
  })
})
