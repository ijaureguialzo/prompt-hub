<template>
  <div class="max-w-md mx-auto mt-12">
    <!-- Loading state -->
    <div v-if="loading" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
      <p class="text-gray-500">{{ t('common.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- User profile -->
    <div v-else-if="user" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">{{ t('profile.heading') }}</h1>

      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-500">{{ t('auth.nameLabel') }}</label>
          <p class="mt-1 text-lg text-gray-900">{{ user.name }}</p>
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-500">{{ t('auth.emailLabel') }}</label>
          <p class="mt-1 text-lg text-gray-900">{{ user.email }}</p>
        </div>

        <!-- Role -->
        <div>
          <label class="block text-sm font-medium text-gray-500">{{ t('profile.roleLabel') }}</label>
          <p class="mt-1 text-lg text-gray-900">{{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser') }}</p>
        </div>

        <!-- Active status -->
        <div>
          <label class="block text-sm font-medium text-gray-500">{{ t('profile.statusLabel') }}</label>
          <p class="mt-1 text-lg" :class="user.isActive ? 'text-green-600' : 'text-red-600'">
            {{ user.isActive ? t('admin.active') : t('admin.deactivated') }}
          </p>
        </div>

        <!-- Created at -->
        <div>
          <label class="block text-sm font-medium text-gray-500">{{ t('date.created') }}</label>
          <p class="mt-1 text-lg text-gray-900">{{ formatDate(user.createdAt) }}</p>
        </div>
      </div>

      <!-- Back link -->
      <div class="mt-6 text-center">
        <router-link to="/" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
          {{ t('profile.backLink') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import { usersApi } from '../api/index.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const user = ref(null)
const loading = ref(true)
const error = ref('')

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(i18nStore.language === 'eu' ? 'eu-ES' : i18nStore.language === 'en' ? 'en-US' : 'es-ES')
}

async function fetchProfile() {
  loading.value = true
  error.value = ''
  try {
    const userId = route.params.id || authStore.user._id

    // If viewing own profile, use the already-loaded user data
    if (userId === authStore.user._id) {
      user.value = { ...authStore.user }
    } else {
      // Admin viewing another user — fetch from API
      const data = await usersApi.getById(userId)
      user.value = data
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>
