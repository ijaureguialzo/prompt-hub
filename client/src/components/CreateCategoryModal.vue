<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">{{ isEdit ? t('createCategoryModal.editTitle') : t('createCategoryModal.newTitle') }}</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('createCategoryModal.nameLabel') }}</label>
            <input v-model="form.name" type="text" required maxlength="50" data-1p-ignore
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              :placeholder="t('createCategoryModal.namePlaceholder')" />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('createCategoryModal.descriptionLabel') }}</label>
            <input v-model="form.description" type="text" maxlength="255" data-1p-ignore
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              :placeholder="t('createCategoryModal.descriptionPlaceholder')" />
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              {{ t('createCategoryModal.cancel') }}
            </button>
            <button type="submit" :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {{ saving ? t('createCategoryModal.saving') : (isEdit ? t('createCategoryModal.update') : t('createCategoryModal.create')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'
import { useI18nStore } from '../stores/useI18nStore.js'

const props = defineProps({
  editing: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const isEdit = computed(() => !!props.editing)
const saving = ref(false)

const form = ref({ name: '', description: '' })

if (props.editing) {
  form.value = { name: props.editing.name, description: props.editing.description || '' }
}

async function handleSubmit() {
  saving.value = true
  try {
    if (isEdit.value) {
      await categoryStore.updateCategory(props.editing._id, form.value)
      uiStore.setSuccess(t('common.categoryUpdated'))
    } else {
      await categoryStore.createCategory(form.value)
      uiStore.setSuccess(t('common.categoryCreated'))
    }
    emit('close')
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    saving.value = false
  }
}
</script>
