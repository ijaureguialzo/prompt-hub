<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">{{ t('settings.heading') }}</h1>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <!-- API Configuration -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">{{ t('settings.apiConfigTitle') }}</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('settings.apiUrlLabel') }}</label>
            <input :value="apiUrl" readonly
              class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono" />
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">{{ t('settings.dataMgmtTitle') }}</h2>
        <div class="space-y-3">
          <button @click="refreshData" :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {{ loading ? t('settings.refreshingBtn') : t('settings.refreshBtn') }}
          </button>
        </div>
      </div>

      <!-- About -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">{{ t('settings.aboutTitle') }}</h2>
        <p class="text-sm text-gray-600">
          {{ t('settings.aboutText') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePromptStore } from '../stores/usePromptStore'
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'
import { useI18nStore } from '../stores/useI18nStore.js'

const promptStore = usePromptStore()
const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const apiUrl = import.meta.env.VITE_API_URL || '/api'
const loading = ref(false)

onMounted(async () => {
  try {
    await Promise.all([
      promptStore.fetchPrompts(),
      categoryStore.fetchCategories()
    ])
  } catch (error) {
    uiStore.setError(error.message)
  }
})

async function refreshData() {
  loading.value = true
  try {
    await Promise.all([
      promptStore.fetchPrompts(),
      categoryStore.fetchCategories()
    ])
    uiStore.setSuccess(t('common.dataRefreshed'))
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    loading.value = false
  }
}
</script>
