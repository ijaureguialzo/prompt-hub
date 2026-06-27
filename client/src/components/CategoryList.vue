<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <h2 class="text-lg font-semibold text-gray-900 mb-3">{{ t('categoryList.heading') }}</h2>

    <div v-if="categoryStore.loading" class="text-sm text-gray-500">{{ t('categoryList.loading') }}</div>

    <ul v-else class="space-y-1">
      <li>
        <button @click="handleSelectCategory(ALL_CATEGORIES_ID)"
          :class="[
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
            !categoryStore.selectedCategoryId
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          ]">
          {{ t('categoryList.allCategories') }} <span class="text-gray-400">({{ promptStore.prompts.length }})</span>
        </button>
      </li>

      <li v-if="getUncategorizedCount() > 0">
        <button @click="handleSelectCategory(UNCATEGORIZED_ID)"
          :class="[
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate',
            isUncategorizedHighlighted()
          ]">
          {{ t('createPromptModal.uncategorized') }} <span class="text-gray-400">({{ getUncategorizedCount() }})</span>
        </button>
      </li>

      <li v-for="cat in categoryStore.categories" :key="cat._id">
        <div class="flex items-center group">
          <button @click="handleSelectCategory(cat._id)"
            :class="[
              'flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate',
              categoryStore.selectedCategoryId === cat._id
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            ]">
            {{ cat.name }} <span class="text-gray-400">({{ promptCounts[cat._id] }})</span>
          </button>
          <div class="flex opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="openEditCategory(cat)" class="p-1 text-gray-400 hover:text-indigo-600" :title="t('categoryList.edit')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-5.007l-4 4" />
              </svg>
            </button>
            <button @click="confirmDeleteCategory(cat._id)" class="p-1 text-gray-400 hover:text-red-600" :title="t('categoryList.delete')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </li>

      <li v-if="categoryStore.categories.length === 0" class="text-sm text-gray-400 italic py-2">
        {{ t('categoryList.noCategories') }}
      </li>
    </ul>

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      v-if="deleteDialogOpen"
      entity-type="'category'"
      :entity-id="pendingDeleteId"
      @close="deleteDialogOpen = false; pendingDeleteId = null"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCategoryStore } from '../stores/useCategoryStore'
import { usePromptStore } from '../stores/usePromptStore'
import { useUIStore } from '../stores/useUIStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import DeleteConfirmationModal from './DeleteConfirmationModal.vue'

const categoryStore = useCategoryStore()
const promptStore = usePromptStore()
const uiStore = useUIStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const uncategorizedCount = computed(() => {
  return promptStore.prompts.filter(p => !p.categoryId || p.categoryId === '').length
})

const promptCounts = computed(() => {
  const counts = {}
  for (const cat of categoryStore.categories) {
    counts[cat._id] = promptStore.prompts.filter(p => p.categoryId?._id === cat._id).length
  }
  return counts
})

const ALL_CATEGORIES_ID = null
const UNCATEGORIZED_ID = '__uncategorized__'

function handleSelectCategory(id) {
  if (id === ALL_CATEGORIES_ID) {
    categoryStore.clearSelection()
  } else if (id === UNCATEGORIZED_ID) {
    categoryStore.selectCategory(UNCATEGORIZED_ID)
  } else {
    categoryStore.selectCategory(id)
  }
}

function isUncategorizedSelected() {
  return categoryStore.selectedCategoryId === UNCATEGORIZED_ID
}

function isUncategorizedHighlighted() {
  return isUncategorizedSelected() ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
}

function getUncategorizedCount() {
  return uncategorizedCount.value
}

const deleteDialogOpen = ref(false)
const pendingDeleteId = ref(null)

function openEditCategory(category) {
  window.dispatchEvent(new CustomEvent('edit-category', { detail: category }))
}

function confirmDeleteCategory(id) {
  pendingDeleteId.value = id
  deleteDialogOpen.value = true
}

function handleDeleteConfirm(id) {
  categoryStore.deleteCategory(id).catch(err => {
    uiStore.setError(err.message)
  })
}
</script>
