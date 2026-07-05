import { defineStore } from 'pinia'

const STORAGE_KEY = 'themeMode'
const MODES = ['light', 'dark', 'auto']

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'auto', // 'light' | 'dark' | 'auto'
    _systemDark: false, // updated by matchMedia listener when mode is 'auto'
  }),

  getters: {
    isDark(state) {
      if (state.mode === 'dark') return true
      if (state.mode === 'light') return false
      return state._systemDark
    },
  },

  actions: {
    init() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved && MODES.includes(saved)) {
          this.mode = saved
        } else {
          this.mode = 'auto'
        }
      } catch {}

      // Initialize _systemDark from current system preference
      if (typeof window !== 'undefined' && window.matchMedia) {
        this._systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }

      // Set up listener for system preference changes (only active in auto mode)
      this._setupMediaQueryListener()
    },

    setMode(mode) {
      if (MODES.includes(mode)) {
        this.mode = mode
        try { localStorage.setItem(STORAGE_KEY, mode) } catch {}

        // Re-setup listener in case mode changed (e.g., auto → dark → auto)
        this._setupMediaQueryListener()
      }
    },

    toggleTheme() {
      const currentIndex = MODES.indexOf(this.mode)
      const nextIndex = (currentIndex + 1) % MODES.length
      this.setMode(MODES[nextIndex])
    },

    _setupMediaQueryListener() {
      // Clean up previous listener if re-initializing
      if (this._mediaQueryListener) {
        try {
          window.matchMedia('(prefers-color-scheme: dark)').removeEventListener(
            'change',
            this._mediaQueryListener
          )
        } catch {}
      }

      if (typeof window !== 'undefined' && window.matchMedia) {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')

        // Only listen for changes when in auto mode
        if (this.mode === 'auto') {
          this._mediaQueryListener = () => {
            this._systemDark = mql.matches
          }
          mql.addEventListener('change', this._mediaQueryListener)
        } else {
          this._mediaQueryListener = null
        }
      }
    },

    /**
     * Clean up event listeners (call on component unmount if needed).
     */
    dispose() {
      if (this._mediaQueryListener) {
        try {
          window.matchMedia('(prefers-color-scheme: dark)').removeEventListener(
            'change',
            this._mediaQueryListener
          )
        } catch {}
        this._mediaQueryListener = null
      }
    },
  },
})
