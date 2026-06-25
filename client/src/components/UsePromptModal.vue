<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">{{ t('promptDetail.useTitle') }}</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Prompt content (read-only) -->
        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ prompt.title }}</h3>

        <div v-if="prompt.categoryId" class="mb-3">
          <span class="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
            {{ prompt.categoryId.name || 'Uncategorized' }}
          </span>
        </div>

        <pre class="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-md border mb-4">{{ prompt.content }}</pre>

        <div v-if="prompt.tags && prompt.tags.length" class="mb-4 flex flex-wrap gap-2">
          <span v-for="tag in prompt.tags" :key="tag"
            class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            {{ tag }}
          </span>
        </div>

        <!-- Copy button -->
        <div class="flex justify-end">
          <button @click="copyToClipboard"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
            {{ t('promptDetail.copyBtn') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUIStore } from '../stores/useUIStore'
import { useI18nStore } from '../stores/useI18nStore.js'

const props = defineProps({
  prompt: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const uiStore = useUIStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

function copyToClipboard() {
  navigator.clipboard.writeText(props.prompt.content).then(() => {
    uiStore.setSuccess(t('common.successCopied'))
  }).catch(() => {
    uiStore.setError(t('common.failedCopy'))
  })
}
</script>
