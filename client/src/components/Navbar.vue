<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            {{ t('nav.title') }}
          </router-link>
            <div v-if="authStore.isAuthenticated" class="hidden sm:flex space-x-4">
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
          <!-- User profile dropdown (authenticated) -->
          <div v-if="authStore.isAuthenticated" class="relative">
            <button @click="isDropdownOpen = !isDropdownOpen"
              class="flex items-center space-x-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="hidden md:inline">{{ authStore.user.name || authStore.user.email }}</span>
              <svg class="w-3 h-3" :class="{ 'rotate-180': isDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown menu -->
            <div v-show="isDropdownOpen"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-sm border border-gray-200 py-1 z-50"
              @click.outside="isDropdownOpen = false">
              <router-link :to="{ name: 'Profile', params: { id: authStore.user._id } }"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-indigo-600">
                {{ t('profile.viewProfile') }}
              </router-link>
              <button @click="handleLogout; isDropdownOpen = false"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-indigo-600">
                {{ t('nav.logout') }}
              </button>
            </div>
          </div>

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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '../stores/useI18nStore'
import { useAuthStore } from '../stores/useAuthStore'

const i18nStore = useI18nStore()
const authStore = useAuthStore()
const t = i18nStore.t
const router = useRouter()

const isDropdownOpen = ref(false)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>
