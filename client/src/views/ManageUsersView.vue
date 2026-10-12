<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Site registration setting -->
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('admin.registrationTitle') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('admin.registrationDesc') }}</p>
        </div>
        <button @click="handleToggleRegistration" :disabled="configLoading"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="isRegistrationEnabled() ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'"
          role="switch" :aria-checked="isRegistrationEnabled()">
          <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            :class="isRegistrationEnabled() ? 'translate-x-6' : 'translate-x-1'" />
        </button>
      </div>
    </div>

    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ t('admin.usersHeading') }}</h1>

    <!-- Loading state -->
    <div v-if="loading || configLoading" class="text-center text-gray-500 dark:text-gray-400 py-8">{{ t('common.loading') }}</div>

    <!-- Error state -->
    <div v-else-if="error" class="text-red-600 dark:text-red-400 text-sm mb-4">{{ error }}</div>

    <!-- User list -->
    <div v-else class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700">
      <div v-for="user in users" :key="user._id" class="p-6 flex items-center justify-between">
        <div>
          <!-- Name: display mode (click to edit) -->
          <span v-if="editingUserId !== user._id"
            @click="startEdit(user)"
            class="text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-indigo-600"
            :title="t('profile.clickToEdit')">
            {{ user.name }}
          </span>
          <!-- Name: edit mode -->
          <input v-else v-model="user.name" type="text" maxlength="100"
            @blur="handleNameChange(user); cancelEdit()"
            @keydown.enter="handleNameChange(user); cancelEdit()"
            @keydown.escape="cancelEdit()"
            class="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-indigo-500 focus:outline-none focus:border-indigo-600 w-full" />
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ user.email }} · {{ user.role }} · {{ user.isActive ? t('admin.active') : t('admin.deactivated') }}
            · {{ t('admin.quotaMeta', { p: user.promptQuota ?? t('admin.quotaGlobal'), c: user.categoryQuota ?? t('admin.quotaGlobal') }) }}
          </p>
        </div>

        <div class="flex items-center space-x-2">
          <!-- Role dropdown: :value + change handler (NOT v-model) so a
               failed request can roll the visible selection back.
               The requesting admin's own row is locked (server refuses it). -->
          <select :value="user.role" :disabled="user._id === authStore.user?._id"
            @change="handleRoleChange(user, $event.target.value)"
            class="text-sm border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 disabled:opacity-50">
            <option value="user">{{ t('admin.roleUser') }}</option>
            <option value="admin">{{ t('admin.roleAdmin') }}</option>
          </select>

          <!-- Toggle active status -->
          <button @click="handleToggleActive(user)" :disabled="user._id === authStore.user?._id"
            :class="[
              user.isActive
                ? 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300',
              'text-sm font-medium disabled:opacity-50'
            ]">
            {{ user.isActive ? t('admin.deactivate') : t('admin.activate') }}
          </button>

          <!-- Delete user (confirmation modal, consistent with the rest) -->
          <button @click="pendingDeleteUser = user"
            :disabled="user._id === authStore.user?._id"
            class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium disabled:opacity-50">
            {{ t('categoryList.delete') }}
          </button>

          <!-- Per-user quota overrides (modal; empty = global default) -->
          <button @click="openQuotaEdit(user)"
            class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
            {{ t('admin.quotaEdit') }}
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="users.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
        {{ t('admin.noUsers') }}
      </div>
    </div>

    <!-- Deactivate-user confirmation (consistent with prompt/category deletes) -->
    <DeleteConfirmationModal
      v-if="pendingDeleteUser"
      entity-type="user"
      :entity-id="pendingDeleteUser._id"
      :entity-label="pendingDeleteUser.email"
      @close="pendingDeleteUser = null"
      @confirm="handleDeactivateUser"
    />

    <!-- Per-user quota overrides -->
    <Modal v-if="quotaUser" :label="t('admin.quotaModalTitle')" panel-class="max-w-sm"
      @close="quotaUser = null">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('admin.quotaModalTitle') }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ quotaUser.email }}</p>
        </div>
        <button @click="quotaUser = null" :aria-label="t('admin.quotaCancel')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">{{ t('admin.quotaModalDesc') }}</p>

      <label class="block mt-4">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('admin.promptQuotaLabel') }}</span>
        <input v-model="promptQuotaDraft" type="number" min="0" max="100000" inputmode="numeric"
          class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </label>
      <label class="block mt-3">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('admin.categoryQuotaLabel') }}</span>
        <input v-model="categoryQuotaDraft" type="number" min="0" max="100000" inputmode="numeric"
          class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </label>

      <div class="flex justify-end space-x-3 mt-6">
        <button @click="quotaUser = null"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
          {{ t('admin.quotaCancel') }}
        </button>
        <button @click="handleSaveQuotas" :disabled="savingQuota"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50">
          {{ t('admin.quotaSave') }}
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import { useUIStore } from '../stores/useUIStore'
import { usersApi, siteConfigApi } from '../api/index.js'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.vue'
import Modal from '../components/Modal.vue'

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
const pendingDeleteUser = ref(null)

// Quota override editor: the user row being edited plus string drafts
// (empty string = null = "follow the global default").
const quotaUser = ref(null)
const promptQuotaDraft = ref('')
const categoryQuotaDraft = ref('')
const savingQuota = ref(false)

function openQuotaEdit(user) {
  quotaUser.value = user
  promptQuotaDraft.value = user.promptQuota == null ? '' : String(user.promptQuota)
  categoryQuotaDraft.value = user.categoryQuota == null ? '' : String(user.categoryQuota)
}

// '' → null (reset to global); otherwise the typed integer (0 is valid).
function quotaValue(draft) {
  if (draft === '' || draft === null) return null
  const n = Number(draft)
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : null
}

async function handleSaveQuotas() {
  const user = quotaUser.value
  if (!user || savingQuota.value) return
  const payload = {
    promptQuota: quotaValue(promptQuotaDraft.value),
    categoryQuota: quotaValue(categoryQuotaDraft.value)
  }
  savingQuota.value = true
  try {
    const updated = await usersApi.update(user._id, payload)
    user.promptQuota = updated.promptQuota ?? null
    user.categoryQuota = updated.categoryQuota ?? null
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
    quotaUser.value = null
    uiStore.setSuccess(t('admin.quotaSaved'))
  } catch (err) {
    uiStore.setError(err.message)
  } finally {
    savingQuota.value = false
  }
}

function startEdit(user) {
  user._originalName = user.name
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
  // Enter fires the handler and then blurs the input — an in-flight guard
  // plus a no-op check prevents duplicate PATCHes.
  if (user._savingName) return
  const name = user.name.trim()
  if (!name || name === user._originalName) return
  user._savingName = true
  try {
    await usersApi.update(user._id, { name })
    user._originalName = name
    uiStore.setSuccess(t('profile.nameUpdated'))
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
  } catch (err) {
    uiStore.setError(err.message)
  } finally {
    delete user._savingName
  }
}

async function handleRoleChange(user, newRole) {
  if (newRole === user.role) return
  // Optimistic set so the select shows the choice while the request is in
  // flight; on failure the previous value is restored (the :value binding
  // re-renders the select to match).
  const previous = user.role
  user.role = newRole
  try {
    await usersApi.update(user._id, { role: newRole })
    uiStore.setSuccess(t('admin.roleUpdated'))
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
  } catch (err) {
    user.role = previous
    uiStore.setError(err.message)
  }
}

async function handleToggleActive(user) {
  try {
    const newStatus = !user.isActive
    await usersApi.update(user._id, { isActive: newStatus })
    user.isActive = newStatus
    uiStore.setSuccess(newStatus ? t('admin.activated') : t('admin.deactivatedMsg'))
    if (user._id === authStore.user?._id) {
      await authStore.updateUser()
    }
  } catch (err) {
    uiStore.setError(err.message)
  }
}

async function handleDeactivateUser(id) {
  try {
    await usersApi.delete(id)
    // Remove from local list without full refresh
    const idx = users.value.findIndex(u => u._id === id)
    if (idx !== -1) {
      users.value.splice(idx, 1)
    }
    uiStore.setSuccess(t('admin.deactivatedMsg'))
  } catch (err) {
    uiStore.setError(err.message)
  } finally {
    pendingDeleteUser.value = null
  }
}

onMounted(() => {
  fetchSiteConfig()
  fetchUsers()
})
</script>
