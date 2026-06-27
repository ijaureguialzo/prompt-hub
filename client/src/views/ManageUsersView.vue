<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Site registration setting -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ t('admin.registrationTitle') }}</h2>
          <p class="text-sm text-gray-500 mt-1">{{ t('admin.registrationDesc') }}</p>
        </div>
        <button @click="handleToggleRegistration" :disabled="configLoading"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="isRegistrationEnabled() ? 'bg-indigo-600' : 'bg-gray-200'"
          role="switch" :aria-checked="isRegistrationEnabled()">
          <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            :class="isRegistrationEnabled() ? 'translate-x-6' : 'translate-x-1'" />
        </button>
      </div>
    </div>

    <h1 class="text-2xl font-bold text-gray-900">{{ t('admin.usersHeading') }}</h1>

    <!-- Loading state -->
    <div v-if="loading || configLoading" class="text-center text-gray-500 py-8">{{ t('common.loading') }}</div>

    <!-- Error state -->
    <div v-else-if="error" class="text-red-600 text-sm mb-4">{{ error }}</div>

    <!-- User list -->
    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
      <div v-for="user in users" :key="user._id" class="p-6 flex items-center justify-between">
        <div>
          <!-- Name: display mode (click to edit) -->
          <span v-if="editingUserId !== user._id"
            @click="startEdit(user)"
            class="text-lg font-semibold text-gray-900 cursor-pointer hover:text-indigo-600"
            :title="t('profile.clickToEdit')">
            {{ user.name }}
          </span>
          <!-- Name: edit mode -->
          <input v-else v-model="user.name" type="text" maxlength="100"
            @blur="handleNameChange(user); cancelEdit()"
            @keydown.enter="handleNameChange(user); cancelEdit()"
            @keydown.escape="cancelEdit()"
            class="text-lg font-semibold text-gray-900 border-b border-indigo-500 focus:outline-none focus:border-indigo-600 w-full" />
          <p class="text-xs text-gray-500">
            {{ user.email }} · {{ user.role }} · {{ user.isActive ? t('admin.active') : t('admin.deactivated') }}
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Role dropdown (admin only) -->
          <select v-model="user.role" @change="handleRoleChange(user)"
            class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="user">{{ t('admin.roleUser') }}</option>
            <option value="admin">{{ t('admin.roleAdmin') }}</option>
          </select>

          <!-- Toggle active status -->
          <button @click="handleToggleActive(user)"
            :class="[
              user.isActive
                ? 'text-red-600 hover:text-red-800'
                : 'text-green-600 hover:text-green-800',
              'text-sm font-medium'
            ]">
            {{ user.isActive ? t('admin.deactivate') : t('admin.activate') }}
          </button>

          <!-- Delete user -->
          <button @click="handleDeleteUser(user)"
            class="text-sm text-red-500 hover:text-red-700 font-medium">
            {{ t('categoryList.delete') }}
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="users.length === 0" class="p-6 text-center text-gray-500">
        {{ t('admin.noUsers') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import { useUIStore } from '../stores/useUIStore'
import { usersApi, siteConfigApi } from '../api/index.js'

const authStore = useAuthStore()
const i18nStore = useI18nStore()
const uiStore = useUIStore()
const t = i18nStore.t

const users = ref([])
const siteConfig = ref(null)
const loading = ref(false)
const configLoading = ref(false)
const error = ref('')
const editingUserId = ref(null)

function startEdit(user) {
  editingUserId.value = user._id
}

function cancelEdit() {
  editingUserId.value = null
}

function isRegistrationEnabled() {
  return siteConfig.value ? siteConfig.value.registrationEnabled : true
}

async function fetchSiteConfig() {
  configLoading.value = true
  try {
    siteConfig.value = await siteConfigApi.getConfig()
  } catch (err) {
    // Silently fail — default to enabled
  } finally {
    configLoading.value = false
  }
}

async function fetchUsers() {
  loading.value = true
  try {
    const data = await usersApi.getAll()
    // Deep copy to avoid reactivity issues with select binding
    users.value = data.map(u => ({ ...u }))
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleToggleRegistration() {
  if (!siteConfig.value) return
  try {
    const newStatus = !siteConfig.value.registrationEnabled
    siteConfig.value = await siteConfigApi.updateConfig({ registrationEnabled: newStatus })
    uiStore.setSuccess(newStatus ? t('admin.registrationEnabled') : t('admin.registrationDisabled'))
  } catch (err) {
    uiStore.setError(err.message)
  }
}

async function handleNameChange(user) {
  try {
    await usersApi.update(user._id, { name: user.name })
    uiStore.setSuccess(t('profile.nameUpdated'))
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
  } catch (err) {
    uiStore.setError(err.message)
  }
}

async function handleRoleChange(user) {
  try {
    await usersApi.update(user._id, { role: user.role })
    uiStore.setSuccess(t('admin.roleUpdated'))
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
  } catch (err) {
    uiStore.setError(err.message)
  }
}

async function handleToggleActive(user) {
  try {
    const newStatus = !user.isActive
    await usersApi.update(user._id, { isActive: newStatus })
    user.isActive = newStatus
    uiStore.setSuccess(newStatus ? t('admin.activated') : t('admin.deactivated'))
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
  } catch (err) {
    uiStore.setError(err.message)
  }
}

async function handleDeleteUser(user) {
  const confirmed = window.confirm(`${t('admin.usersHeading')}: ${user.email}?`)
  if (!confirmed) return
  try {
    await usersApi.delete(user._id)
    // Remove from local list without full refresh
    const idx = users.value.findIndex(u => u._id === user._id)
    if (idx !== -1) {
      users.value.splice(idx, 1)
    }
    uiStore.setSuccess(t('admin.deactivated'))
  } catch (err) {
    uiStore.setError(err.message)
  }
}

onMounted(() => {
  fetchSiteConfig()
  fetchUsers()
})
</script>
