import { defineStore } from 'pinia'
import en from '../locales/en.js'
import es from '../locales/es.js'
import eu from '../locales/eu.js'

const localeMap = { es: 'es', eu: 'eu', en: 'en', 'en-us': 'en', 'en-gb': 'en' }

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en'
  const lang = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase()
  return localeMap[lang] || (lang.startsWith('eu') ? 'eu' : lang.startsWith('es') ? 'es' : 'en')
}

export function resolve(obj, key) {
  const parts = key.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key
    current = current[part]
  }
  return typeof current === 'string' ? current : key
}

// Replaces `{token}` placeholders in a template with values from `params`.
// Tokens without a matching param are left as-is (a visible hint that the
// locale/param pair is broken, rather than a silent empty string).
export function interpolate(template, params = {}) {
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name])
  )
}

// Plain (store-independent) translation used by the API client, which may
// run outside an active pinia. Returns the key itself when not found.
export function translateFrom(locale, key, params = {}) {
  return interpolate(resolve(locale, key), params)
}

export const useI18nStore = defineStore('i18n', {
  state: () => ({
    language: detectBrowserLanguage(),
    locales: { en, es, eu }
  }),

  getters: {
    t: (state) => (key, params) => translateFrom(state.locales[state.language], key, params),
    currentLocale: (state) => state.locales[state.language] || en
  },

  actions: {
    setLanguage(lang) {
      if (this.locales[lang]) {
        this.language = lang
        try {
          localStorage.setItem('language', lang)
        } catch {
          /* storage may be unavailable */
        }
      }
    },

    init() {
      try {
        const saved = localStorage.getItem('language')
        if (saved && this.locales[saved]) {
          this.language = saved
        }
      } catch {
        /* non-JSON stored value — fall through to defaults */
      }
    }
  }
})
