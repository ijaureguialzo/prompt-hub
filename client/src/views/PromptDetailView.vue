<template>
  <div v-if="promptStore.loading" class="text-center py-8">
    <p class="text-gray-500">Loading prompt...</p>
  </div>

  <div v-else-if="promptStore.currentPrompt" class="max-w-4xl mx-auto">
    <router-link to="/" class="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Prompts
    </router-link>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-start justify-between mb-4">
        <h1 class="text-2xl font-bold text-gray-900">{{ promptStore.currentPrompt.title }}</h1>
        <div class="flex space-x-2">
          <button @click="copyToClipboard(promptStore.currentPrompt.content)"
            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            Copy
          </button>
          <button @click="editorOpen = true"
            class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Edit
          </button>
          <button @click="confirmDelete"
            class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>

      <div v-if="promptStore.currentPrompt.categoryId" class="mb-4">
        <router-link :to="`/category/${promptStore.currentPrompt.categoryId._id}`"
          class="inline-block px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full">
          {{ promptStore.currentPrompt.categoryId.name }}
        </router-link>
      </div>

      <pre class="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-md border">{{ promptStore.currentPrompt.content }}</pre>

      <div v-if="promptStore.currentPrompt.tags && promptStore.currentPrompt.tags.length" class="mt-4 flex flex-wrap gap-2">
        <span v-for="tag in promptStore.currentPrompt.tags" :key="tag"
          class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
          {{ tag }}
        </span>
      </div>

      <p class="text-xs text-gray-400 mt-4">
        Created: {{ new Date(promptStore.currentPrompt.createdAt).toLocaleDateString() }}
        <span v-if="promptStore.currentPrompt.updatedAt && promptStore.currentPrompt.updatedAt !== promptStore.currentPrompt.createdAt">
          | Updated: {{ new Date(promptStore.currentPrompt.updatedAt).toLocaleDateString() }}
        </span>
      </p>
    </div>

    <!-- Editor Modal -->
    <PromptEditor v-if="editorOpen" :prompt="promptStore.currentPrompt" @close="editorOpen = false" />
  </div>

  <div v-else class="text-center py-8">
    <p class="text-gray-500">Prompt not found.</p>
    <router-link to="/" class="text-indigo-600 hover:underline">Back to Prompts</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePromptStore } from '../stores/usePromptStore'
import { useUIStore } from '../stores/useUIStore'
import PromptEditor from '../components/PromptEditor.vue'

const route = useRoute()
const router = useRouter()
const promptStore = usePromptStore()
const uiStore = useUIStore()

const editorOpen = ref(false)

onMounted(async () => {
  try {
    await promptStore.fetchPrompt(route.params.id)
  } catch (error) {
    uiStore.setError(error.message)
  }
})

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    uiStore.setSuccess('Prompt copied to clipboard!')
  })
}

function confirmDelete() {
  if (confirm('Are you sure you want to delete this prompt?')) {
    promptStore.deletePrompt(route.params.id).then(() => {
      router.push('/')
    }).catch(err => {
      uiStore.setError(err.message)
    })
  }
}
</script>
