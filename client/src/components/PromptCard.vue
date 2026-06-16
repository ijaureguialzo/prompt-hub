<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <router-link
          :to="`/prompt/${prompt._id}`"
          class="text-lg font-semibold text-gray-900 hover:text-indigo-600 truncate"
        >
          {{ prompt.title }}
        </router-link>
        <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ prompt.content }}</p>
        <div v-if="prompt.categoryId" class="mt-2">
          <span class="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
            {{ prompt.categoryId.name || 'Uncategorized' }}
          </span>
        </div>
        <div v-if="prompt.tags && prompt.tags.length" class="mt-2 flex flex-wrap gap-1">
          <span v-for="tag in prompt.tags" :key="tag"
            class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            {{ tag }}
          </span>
        </div>
      </div>
      <div class="flex items-center space-x-2 ml-4 flex-shrink-0">
        <button
          @click="copyToClipboard(prompt.content)"
          class="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          title="Copy prompt"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 11h4a2 2 0 012 2v5a2 2 0 01-2 2h-8a2 2 0 01-2-2v-5a2 2 0 012-2h1z" />
          </svg>
        </button>
        <router-link
          :to="`/prompt/${prompt._id}`"
          class="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          title="Edit"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-5.007a1 1 0 00-1.414-1.414l-4 4" />
          </svg>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUIStore } from '../stores/useUIStore'

const props = defineProps({
  prompt: { type: Object, required: true },
})

const uiStore = useUIStore()

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    uiStore.setSuccess('Prompt copied to clipboard!')
  }).catch(() => {
    uiStore.setError('Failed to copy prompt')
  })
}
</script>
