import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useI18nStore } from './stores/useI18nStore.js'
import { useThemeStore } from './stores/useThemeStore.js'
import { useAuthStore } from './stores/useAuthStore.js'
import { registerUnauthorizedHandler } from './api/index.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialize i18n store (reads localStorage, detects browser language)
const i18nStore = useI18nStore(pinia)
i18nStore.init()

// Keep <html lang> in sync for screen readers and spell checkers
watch(
  () => i18nStore.language,
  (lang) => {
    document.documentElement.lang = lang
  },
  { immediate: true }
)

// Initialize theme store (reads localStorage, sets up system preference listener)
const themeStore = useThemeStore(pinia)
themeStore.init()

app.use(router)

// On 401 (expired session): clear the session and redirect through the
// router — a soft navigation, not a full page reload. Requests made on
// the login/register pages never trigger a redirect.
const authStore = useAuthStore(pinia)
registerUnauthorizedHandler((path) => {
  if (path === '/login' || path === '/register') return
  authStore.logout()
  router.push({ name: 'Login', query: { redirect: path } })
})

app.mount('#app')
