<template>
  <div class="max-w-md mx-auto mt-12">
    <!-- Loading state -->
    <div v-if="loading" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
      <p class="text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
      <p class="text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- User profile -->
    <div v-else-if="user" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">{{ t('profile.heading') }}</h1>

      <div class="space-y-4">
        <!-- Name (editable for own profile) -->
        <div>
          <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auth.nameLabel') }}</label>
          <template v-if="isOwnProfile && editingName">
            <input v-model="nameDraft" type="text" maxlength="100"
              @blur="saveName"
              @keydown.enter="saveName"
              @keydown.escape="editingName = false"
              class="mt-1 w-full px-2 py-1 text-lg border border-indigo-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
          </template>
          <p v-else
            @click="startEditName"
            class="mt-1 text-lg text-gray-900 dark:text-gray-100"
            :class="{ 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400': isOwnProfile }"
            :title="isOwnProfile ? t('profile.clickToEdit') : ''">
            {{ user.name }}
          </p>
        </div>

        <!-- Email (editable for own profile) -->
        <div>
          <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('auth.emailLabel') }}</label>
          <template v-if="isOwnProfile && editingEmail">
            <input v-model="emailDraft" type="email" maxlength="254"
              @blur="saveEmail"
              @keydown.enter="saveEmail"
              @keydown.escape="editingEmail = false"
              class="mt-1 w-full px-2 py-1 text-lg border border-indigo-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
          </template>
          <p v-else
            @click="startEditEmail"
            class="mt-1 text-lg text-gray-900 dark:text-gray-100"
            :class="{ 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400': isOwnProfile }"
            :title="isOwnProfile ? t('profile.clickToEditEmail') : ''">
            {{ user.email }}
          </p>
        </div>

        <!-- Role -->
        <div>
          <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('profile.roleLabel') }}</label>
          <p class="mt-1 text-lg text-gray-900 dark:text-gray-100">{{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser') }}</p>
        </div>

        <!-- Active status -->
        <div>
          <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('profile.statusLabel') }}</label>
          <p class="mt-1 text-lg" :class="user.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ user.isActive ? t('admin.active') : t('admin.deactivated') }}
          </p>
        </div>

        <!-- Created at -->
        <div>
          <label class="block text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('date.created') }}</label>
          <p class="mt-1 text-lg text-gray-900 dark:text-gray-100">{{ formatDate(user.createdAt) }}</p>
        </div>
      </div>

      <!-- Security: change password (own profile only) -->
      <div v-if="isOwnProfile" class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ t('profile.securityTitle') }}</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('profile.currentPassword') }}</label>
            <input v-model="passwordForm.current" type="password" autocomplete="current-password"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('profile.newPassword') }}</label>
            <input v-model="passwordForm.next" type="password" autocomplete="new-password" minlength="8"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{{ t('profile.confirmPassword') }}</label>
            <input v-model="passwordForm.confirm" type="password" autocomplete="new-password"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
          </div>
          <button @click="changePassword" :disabled="savingPassword"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {{ savingPassword ? t('common.loading') : t('profile.changePassword') }}
          </button>
        </div>
      </div>

      <!-- Back link -->
      <div class="mt-6 text-center">
        <router-link to="/" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium">
          {{ t('profile.backLink') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'
import { useUIStore } from '../stores/useUIStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import { usersApi } from '../api/index.js'

const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()
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

// --- Self-service editing (own profile only) ---

const isOwnProfile = computed(() =>
  !!user.value && !!authStore.user && String(user.value._id) === String(authStore.user._id)
)

const editingName = ref(false)
const nameDraft = ref('')

function startEditName() {
  if (!isOwnProfile.value) return
  nameDraft.value = user.value.name || ''
  editingName.value = true
}

async function saveName() {
  if (!editingName.value) return
  editingName.value = false
  const name = nameDraft.value.trim()
  if (!name || name === user.value.name) return
  try {
    const updated = await authStore.updateMe({ name })
    user.value.name = updated.name
    uiStore.setSuccess(t('profile.nameUpdated'))
  } catch (err) {
    uiStore.setError(err.message)
  }
}

const editingEmail = ref(false)
const emailDraft = ref('')

function startEditEmail() {
  if (!isOwnProfile.value) return
  emailDraft.value = user.value.email || ''
  editingEmail.value = true
}

async function saveEmail() {
  if (!editingEmail.value) return
  editingEmail.value = false
  const email = emailDraft.value.trim()
  if (!email || email.toLowerCase() === user.value.email) return
  try {
    const updated = await authStore.updateMe({ email })
    user.value.email = updated.email
    uiStore.setSuccess(t('profile.emailUpdated'))
  } catch (err) {
    uiStore.setError(err.message)
  }
}

const passwordForm = ref({ current: '', next: '', confirm: '' })
const savingPassword = ref(false)

async function changePassword() {
  const { current, next, confirm } = passwordForm.value
  if (!current || !next) {
    uiStore.setError(t('profile.passwordFillAll'))
    return
  }
  if (next.length < 8) {
    uiStore.setError(t('profile.passwordTooShort'))
    return
  }
  if (next !== confirm) {
    uiStore.setError(t('profile.passwordMismatch'))
    return
  }

  savingPassword.value = true
  try {
    await authStore.updateMe({ currentPassword: current, newPassword: next })
    passwordForm.value = { current: '', next: '', confirm: '' }
    uiStore.setSuccess(t('profile.passwordChanged'))
  } catch (err) {
    uiStore.setError(err.message)
  } finally {
    savingPassword.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>
