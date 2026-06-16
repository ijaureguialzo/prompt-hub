import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useI18nStore } from './stores/useI18nStore.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Initialize i18n store (reads localStorage, detects browser language)
const i18nStore = useI18nStore(pinia)
i18nStore.init()

app.use(router)
app.mount('#app')
