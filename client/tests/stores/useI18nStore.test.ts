import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useI18nStore, translateFrom, interpolate } from '@/stores/useI18nStore'
import en from '@/locales/en.js'

function createStoresAndSetActive() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

function getI18nStore() {
  const store = useI18nStore()
  return store
}

describe('useI18nStore', () => {
  beforeEach(() => {
    createStoresAndSetActive()
    ;(window.localStorage as { clear: () => void }).clear()
  })

  // --- t() getter ---

  it('t() resolves a simple key to its translation', () => {
    const store = getI18nStore()
    // en.js has nav.title: 'PromptHub'
    expect(store.t('nav.title')).toBe('PromptHub')
  })

  it('t() resolves a nested key with dot notation', () => {
    const store = getI18nStore()
    // en.js has categoryList.heading: 'Categories'
    expect(store.t('categoryList.heading')).toBe('Categories')
  })

  it('t() returns the key itself when not found (fallback)', () => {
    const store = getI18nStore()
    expect(store.t('nonexistent.key')).toBe('nonexistent.key')
  })

  it("t() returns the key when the locale doesn't have it", () => {
    const store = getI18nStore()
    // Switch to es locale and look for a key that might not exist in es.
    store.setLanguage('es')
    const result = store.t('this.key.does.not.exist.es')
    expect(result).toBe('this.key.does.not.exist.es')
  })

  // --- setLanguage() ---

  it('setLanguage("es") changes language and persists to localStorage', () => {
    const store = getI18nStore()
    store.setLanguage('es')
    expect(store.language).toBe('es')
    expect(window.localStorage.setItem).toHaveBeenCalledWith('language', 'es')
  })

  it("setLanguage('eu') changes language to euskara", () => {
    const store = getI18nStore()
    store.setLanguage('eu')
    expect(store.language).toBe('eu')
  })

  it("setLanguage('en') changes language to english", () => {
    const store = getI18nStore()
    store.setLanguage('en')
    expect(store.language).toBe('en')
  })

  it('setLanguage with invalid language does not change language', () => {
    const store = getI18nStore()
    store.setLanguage('xx')
    expect(store.language).not.toBe('xx')
  })

  // --- init() ---

  it('init() restores language from localStorage when saved', () => {
    const store = useI18nStore()
    ;(window.localStorage as { setItem: (k: string, v: string) => void }).setItem('language', 'es')
    store.init()
    expect(store.language).toBe('es')
  })

  it('init() does not change language when nothing is saved in localStorage', () => {
    const store = useI18nStore()
    // Default language is detected from browser (mocked as 'en').
    const initialLang = store.language
    store.init()
    expect(store.language).toBe(initialLang)
  })

  // --- currentLocale getter ---

  it('currentLocale returns the full locale object for the current language', () => {
    const store = getI18nStore()
    expect(store.currentLocale).toHaveProperty('nav')
  })

  it("currentLocale returns the en locale when language is 'en'", () => {
    const store = getI18nStore()
    expect(store.currentLocale).toHaveProperty('nav.title', 'PromptHub')
  })

  // --- parameter interpolation ---

  it('t() interpolates {param} tokens from the given params', () => {
    const store = getI18nStore()
    store.setLanguage('es')
    expect(store.t('errors.limitReached', { limit: 42 })).toBe(
      'Has alcanzado el límite por usuario (42).'
    )
  })

  it('t() interpolates in the eu locale', () => {
    const store = getI18nStore()
    store.setLanguage('eu')
    expect(store.t('errors.limitReached', { limit: 42 })).toBe(
      'Erabiltzaileko muga gainditu duzu (42).'
    )
  })

  it('t() leaves unmatched tokens as-is (visible hint, not silent)', () => {
    const store = getI18nStore()
    expect(store.t('errors.limitReached')).toBe('You have reached the per-user limit ({limit}).')
  })

  it('t() works for every error code in all three locales', () => {
    const store = getI18nStore()
    const errorCodes = Object.keys(en.errors)
    expect(errorCodes.length).toBeGreaterThan(10)
    for (const lang of ['en', 'es', 'eu']) {
      store.setLanguage(lang)
      for (const code of errorCodes) {
        const key = `errors.${code}`
        const value = store.t(key, { limit: 1 })
        expect(value, `${lang} -> ${key}`).not.toBe(key)
        expect(value, `${lang} -> ${key}`).not.toContain('undefined')
      }
    }
  })

  // --- translateFrom / interpolate (store-independent helpers) ---

  it('translateFrom resolves against an explicit locale object', () => {
    expect(translateFrom(en, 'errors.invalidToken')).toBe(
      'Your session has expired. Please sign in again.'
    )
  })

  it('translateFrom returns the key when missing', () => {
    expect(translateFrom(en, 'no.such.key')).toBe('no.such.key')
  })

  it('interpolate substitutes tokens and keeps unknown ones', () => {
    expect(interpolate('Hello {name}!', { name: 'world' })).toBe('Hello world!')
    expect(interpolate('{a} {b}', { a: 1 })).toBe('1 {b}')
  })
})
