<template>
  <div class="max-w-md mx-auto mt-12">
    <!-- Registration disabled message -->
    <div v-if="!registrationEnabled" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
      <p class="text-gray-600">{{ t('admin.registrationDisabled') }}</p>
      <p class="text-sm text-gray-500 mt-4">
        {{ t('auth.hasAccount') }}
        <router-link to="/login" class="text-indigo-600 hover:text-indigo-700">
          {{ t('auth.loginLink') }}
        </router-link>
      </p>
    </div>

    <!-- Registration form -->
    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">{{ t('auth.registerTitle') }}</h1>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.emailLabel') }}</label>
          <input v-model="email" type="email" required maxlength="255"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.passwordLabel') }}</label>
          <input v-model="password" type="password" required minlength="8"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.confirmPasswordLabel') }}</label>
          <input v-model="confirmPassword" type="password" required minlength="8"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <!-- Error message -->
        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

        <!-- Submit -->
        <button type="submit" :disabled="loading || password !== confirmPassword"
          class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {{ loading ? t('auth.registering') : t('auth.registerBtn') }}
        </button>

        <!-- Login link -->
        <p v-if="!error" class="text-center text-sm text-gray-600">
          {{ t('auth.hasAccount') }}
          <router-link to="/login" class="text-indigo-600 hover:text-indigo-700">
            {{ t('auth.loginLink') }}
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import { siteConfigApi } from '../api/index.js'

const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t
const router = useRouter()

const registrationEnabled = ref(true)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const config = await siteConfigApi.getPublicConfig()
    registrationEnabled.value = config.registrationEnabled !== false // default true
  } catch {
    registrationEnabled.value = true // default to enabled on error
  }
})

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    error.value = t('auth.passwordMismatch')
    return
  }
  error.value = ''
  loading.value = true
  try {
    await authStore.register(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
