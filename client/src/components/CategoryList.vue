<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ t('categoryList.heading') }}</h2>

    <div v-if="categoryStore.loading" class="text-sm text-gray-500 dark:text-gray-400">{{ t('categoryList.loading') }}</div>

    <ul v-else class="space-y-1">
      <li>
        <button @click="handleSelectCategory(ALL_CATEGORIES_ID)"
          :class="[
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
            !categoryStore.selectedCategoryId
              ? 'bg-indigo-600 text-white font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
          ]">
          {{ t('categoryList.allCategories') }} <span class="text-gray-500 dark:text-gray-400">({{ categoryStore.totalPrompts }})</span>
        </button>
      </li>

      <li v-if="categoryStore.uncategorizedCount > 0">
        <button @click="handleSelectCategory(UNCATEGORIZED_ID)"
          :class="[
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate',
            isUncategorizedHighlighted()
          ]">
          {{ t('createPromptModal.uncategorized') }} <span class="text-gray-500 dark:text-gray-400">({{ categoryStore.uncategorizedCount }})</span>
        </button>
      </li>

      <li v-for="cat in categoryStore.categories" :key="cat._id">
        <div class="flex items-center group">
          <button @click="handleSelectCategory(cat._id)"
            :class="[
              'flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate',
              categoryStore.selectedCategoryId === cat._id
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
            ]">
            {{ cat.name }} <span class="text-gray-500 dark:text-gray-400">({{ cat.promptCount ?? localCounts[cat._id] ?? 0 }})</span>
          </button>
          <div class="flex opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="openEditCategory(cat)" class="p-1 text-gray-400 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400" :title="t('categoryList.edit')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-5.007l-4 4" />
              </svg>
            </button>
            <button @click="confirmDeleteCategory(cat._id)" class="p-1 text-gray-400 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400" :title="t('categoryList.delete')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" width="2"
                  d="M19 7l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a2 2 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </li>

      <li v-if="categoryStore.categories.length === 0" class="text-sm text-gray-500 dark:text-gray-400 italic py-2">
        {{ t('categoryList.noCategories') }}
      </li>
    </ul>

    <!-- Per-user quota indicator (discrete: usage against the per-user caps) -->
    <div
      v-if="categoryStore.promptQuota || categoryStore.categoryQuota"
      class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500"
    >
      <span v-if="categoryStore.promptQuota">{{ t('categoryList.promptsQuota', { used: categoryStore.promptQuota.used, limit: categoryStore.promptQuota.limit }) }}</span>
      <span v-if="categoryStore.categoryQuota"> · {{ t('categoryList.categoriesQuota', { used: categoryStore.categoryQuota.used, limit: categoryStore.categoryQuota.limit }) }}</span>
    </div>

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

// Per-category counts: the canonical source is the server-provided
// promptCount (accurate even though the prompt list is paginated); the
// local window is only a fallback for older API responses.
const localCounts = computed(() => {
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
  return isUncategorizedSelected() ? 'bg-indigo-600 text-white font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
}

const deleteDialogOpen = ref(false)
const pendingDeleteId = ref(null)

function openEditCategory(category) {
  uiStore.setEditingCategory(category)
  uiStore.setShowCreateCategoryModal(true)
}

function confirmDeleteCategory(id) {
  pendingDeleteId.value = id
  deleteDialogOpen.value = true
}

function handleDeleteConfirm(id) {
  categoryStore
    .deleteCategory(id)
    .then(() => {
      // Refresh the list AND the server-side counts (promptCount, etc.)
      return categoryStore.fetchCategories()
    })
    .catch(err => {
      uiStore.setError(err.message)
    })
}
</script>
