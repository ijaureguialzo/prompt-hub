<template>
  <div class="max-w-md mx-auto mt-12">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">{{ t('auth.loginTitle') }}</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.emailLabel') }}</label>
          <input v-model="email" type="email" required maxlength="255" data-1p-ignore
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.passwordLabel') }}</label>
          <input v-model="password" type="password" required minlength="8" data-1p-ignore
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <!-- Error message -->
        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>

        <!-- Submit -->
        <button type="submit" :disabled="loading"
          class="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
          {{ loading ? t('auth.loggingIn') : t('auth.loginBtn') }}
        </button>

        <!-- Register link (only if no users exist yet, registration is allowed) -->
        <p v-if="!error" class="text-center text-sm text-gray-600">
          {{ t('auth.noAccount') }}
          <router-link to="/register" class="text-indigo-600 hover:text-indigo-700">
            {{ t('auth.registerLink') }}
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'

const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')

async function handleLogin() {
  error.value = ''
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  }
}
</script>
