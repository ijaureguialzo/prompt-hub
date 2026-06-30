<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">{{ isEdit ? t('createPromptModal.editTitle') : t('createPromptModal.newTitle') }}</h2>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('createPromptModal.titleLabel') }}</label>
            <input v-model="form.title" type="text" required maxlength="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              :placeholder="t('createPromptModal.titlePlaceholder')" />
          </div>

          <!-- Category -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('createPromptModal.categoryLabel') }}</label>
            <select v-model="form.categoryId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">{{ t('createPromptModal.selectCategoryOption') }}</option>
              <option v-for="cat in categoriesWithUncategorized" :key="cat._id" :value="cat._id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Content -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('createPromptModal.contentLabel') }}</label>
            <textarea v-model="form.content" rows="8" required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              :placeholder="t('createPromptModal.contentPlaceholder')"></textarea>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('createPromptModal.tagsLabel') }}</label>
            <input v-model="tagsInput" type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              :placeholder="t('createPromptModal.tagsPlaceholder')" />
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              {{ t('createPromptModal.cancel') }}
            </button>
            <button type="submit" :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {{ saving ? t('createPromptModal.creating') : (isEdit ? t('createPromptModal.update') : t('createPromptModal.create')) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePromptStore } from '../stores/usePromptStore'
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'

const props = defineProps({
  prompt: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const promptStore = usePromptStore()
const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const categories = computed(() => categoryStore.categories)

const uncategorizedCount = computed(() => {
  return promptStore.prompts.filter(p => !p.categoryId).length
})

const categoriesWithUncategorized = computed(() => {
  if (uncategorizedCount.value > 0) {
    return [{ _id: '__uncategorized__', name: t('createPromptModal.uncategorized') }].concat(categories.value)
  }
  return categories.value
})

const isEdit = computed(() => !!props.prompt)

const saving = ref(false)
const tagsInput = ref('')

const form = ref({ title: '', content: '', categoryId: '' })

onMounted(() => {
  categoryStore.fetchCategories().catch(() => {})

  if (props.prompt) {
    form.value = {
      title: props.prompt.title,
      content: props.prompt.content,
      categoryId: props.prompt.categoryId?._id || props.prompt.categoryId || '',
    }
    tagsInput.value = (props.prompt.tags || []).join(', ')
  } else {
    form.value = { title: '', content: '', categoryId: categoryStore.selectedCategoryId || '' }
    tagsInput.value = ''
  }
})

async function handleSubmit() {
  saving.value = true
  try {
    const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean)

    // Convert empty string or virtual uncategorized to null
    const submitData = { ...form.value, tags }
    if (submitData.categoryId === '' || submitData.categoryId === '__uncategorized__') {
      submitData.categoryId = null
    }

    if (isEdit.value) {
      await promptStore.updatePrompt(props.prompt._id, submitData)
      uiStore.setSuccess(t('common.promptUpdated'))
    } else {
      await promptStore.createPrompt(submitData)
      uiStore.setSuccess(t('common.promptCreated'))
    }

    emit('saved')
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    saving.value = false
  }
}
</script>
