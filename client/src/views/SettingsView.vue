<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <!-- API Configuration -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">API Configuration</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
            <input :value="apiUrl" readonly
              class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono" />
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Data Management</h2>
        <div class="space-y-3">
          <button @click="refreshData" :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {{ loading ? 'Refreshing...' : 'Refresh All Data' }}
          </button>
        </div>
      </div>

      <!-- About -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-3">About</h2>
        <p class="text-sm text-gray-600">
          PromptHub v1.0.0 - A modern prompt management system built with Vue 3, Express, and MongoDB.
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

const promptStore = usePromptStore()
const categoryStore = useCategoryStore()
const uiStore = useUIStore()

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
    uiStore.setSuccess('Data refreshed successfully!')
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    loading.value = false
  }
}
</script>
