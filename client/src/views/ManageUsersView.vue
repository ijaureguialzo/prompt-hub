<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ t('admin.usersHeading') }}</h1>

    <!-- Loading state -->
    <div v-if="loading" class="text-center text-gray-500 py-8">{{ t('common.loading') }}</div>

    <!-- Error state -->
    <div v-else-if="error" class="text-red-600 text-sm mb-4">{{ error }}</div>

    <!-- User list -->
    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
      <div v-for="user in users" :key="user._id" class="p-6 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900">{{ user.email }}</p>
          <p class="text-xs text-gray-500">
            {{ user.role }} · {{ user.isActive ? t('admin.active') : t('admin.deactivated') }}
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
import { usersApi } from '../api/index.js'

const authStore = useAuthStore()
const i18nStore = useI18nStore()
const uiStore = useUIStore()
const t = i18nStore.t

const users = ref([])
const loading = ref(false)
const error = ref('')

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

async function handleRoleChange(user) {
  try {
    await usersApi.update(user._id, { role: user.role })
    uiStore.setSuccess(t('admin.roleUpdated'))
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
  } catch (err) {
    uiStore.setError(err.message)
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
