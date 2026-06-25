<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            {{ t('nav.title') }}
          </router-link>
          <div class="hidden sm:flex space-x-4">
            <router-link to="/" class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              {{ t('nav.promptsLink') }}
            </router-link>
            <router-link v-if="authStore.isAdmin" to="/admin/users"
              class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              {{ t('nav.adminLink') }}
            </router-link>
            <router-link to="/settings" class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              {{ t('nav.settingsLink') }}
            </router-link>
          </div>
        </div>

        <!-- Right side: user info + logout + language -->
        <div class="flex items-center space-x-4">
          <!-- User info (authenticated) -->
          <template v-if="authStore.isAuthenticated">
            <span class="text-sm text-gray-600 hidden md:inline">{{ authStore.user.email }}</span>
            <button @click="handleLogout"
              class="text-sm text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md font-medium">
              {{ t('nav.logout') }}
            </button>
          </template>

          <!-- Language selector -->
          <div class="flex items-center space-x-1 text-sm">
            <button @click="i18nStore.setLanguage('es')"
              :class="[i18nStore.language === 'es' ? 'text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700']">
              es
            </button>
            <span class="text-gray-300">|</span>
            <button @click="i18nStore.setLanguage('eu')"
              :class="[i18nStore.language === 'eu' ? 'text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700']">
              eu
            </button>
            <span class="text-gray-300">|</span>
            <button @click="i18nStore.setLanguage('en')"
              :class="[i18nStore.language === 'en' ? 'text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700']">
              en
            </button>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useI18nStore } from '../stores/useI18nStore'
import { useAuthStore } from '../stores/useAuthStore'

const i18nStore = useI18nStore()
const authStore = useAuthStore()
const t = i18nStore.t
const router = useRouter()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>
