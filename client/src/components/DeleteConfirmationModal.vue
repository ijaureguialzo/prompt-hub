<template>
  <Modal :label="modalTitle" panel-class="max-w-md" @close="$emit('close')">
    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ modalTitle }}</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">{{ confirmationMessage }}</p>
    <div class="flex justify-end space-x-3">
      <button type="button" @click="$emit('close')"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
        {{ t('createPromptModal.cancel') }}
      </button>
      <button type="button" @click="handleConfirm"
        class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
        {{ t('categoryList.delete') }}
      </button>
    </div>
  </Modal>
</template>

<script setup>
import { computed } from 'vue'
import { useI18nStore } from '../stores/useI18nStore.js'
import Modal from './Modal.vue'

const props = defineProps({
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  // Optional human-readable label shown in the message (e.g. the user's email)
  entityLabel: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])

const i18nStore = useI18nStore()
const t = i18nStore.t

// Deactivating a user is a soft delete (their data survives), so the
// wording differs from a hard prompt/category deletion.
const modalTitle = computed(() =>
  props.entityType === 'user' ? t('common.confirmDeactivateTitle') : t('common.confirmDeleteTitle')
)

const confirmationMessage = computed(() => {
  if (props.entityType === 'prompt') {
    return t('common.confirmDeletePrompt')
  }
  if (props.entityType === 'user') {
    return props.entityLabel
      ? t('common.confirmDeactivateUserLabeled').replace('{label}', props.entityLabel)
      : t('common.confirmDeactivateUser')
  }
  return t('common.confirmDeleteCategory')
})

function handleConfirm() {
  emit('confirm', props.entityId)
  emit('close')
}
</script>
