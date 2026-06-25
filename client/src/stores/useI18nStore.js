import { defineStore } from 'pinia'
import en from '../locales/en.js'
import es from '../locales/es.js'
import eu from '../locales/eu.js'

const localeMap = { es: 'es', eu: 'eu', en: 'en', 'en-us': 'en', 'en-gb': 'en' }

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en'
  const lang = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase()
  return localeMap[lang] || (lang.startsWith('eu') ? 'eu' : (lang.startsWith('es') ? 'es' : 'en'))
}

function resolve(obj, key) {
  const parts = key.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key
    current = current[part]
  }
  return typeof current === 'string' ? current : key
}

export const useI18nStore = defineStore('i18n', {
  state: () => ({
    language: detectBrowserLanguage(),
    locales: { en, es, eu },
  }),

  getters: {
    t: (state) => (key) => resolve(state.locales[state.language], key),
    currentLocale: (state) => state.locales[state.language] || en,
  },

  actions: {
    setLanguage(lang) {
      if (this.locales[lang]) {
        this.language = lang
        try { localStorage.setItem('language', lang) } catch {}
      }
    },

    init() {
      try {
        const saved = localStorage.getItem('language')
        if (saved && this.locales[saved]) {
          this.language = saved
        }
      } catch {}
    },
  },
})
