<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
      <div class="p-6">
        <h2 class="text-xl font-bold text-gray-900 mb-2">{{ t('common.confirmDeleteTitle') }}</h2>
        <p class="text-sm text-gray-600 mb-6">{{ confirmationMessage }}</p>
        <div class="flex justify-end space-x-3">
          <button type="button" @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            {{ t('createPromptModal.cancel') }}
          </button>
          <button type="button" @click="handleConfirm"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
            {{ t('categoryList.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18nStore } from '../stores/useI18nStore.js'

const props = defineProps({
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
})

const emit = defineEmits(['close', 'confirm'])

const i18nStore = useI18nStore()
const t = i18nStore.t

const confirmationMessage = computed(() => {
  if (props.entityType === 'prompt') {
    return t('common.confirmDeletePrompt')
  }
  return t('common.confirmDeleteCategory')
})

function handleConfirm() {
  emit('confirm', props.entityId)
  emit('close')
}
</script>
