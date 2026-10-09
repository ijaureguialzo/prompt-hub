<template>
  <div class="relative">
    <div v-if="categoryStore.loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="categoryStore.currentCategory" class="max-w-4xl mx-auto">
      <router-link to="/" class="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-4">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ t('categoryView.backLink') }}
      </router-link>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ categoryStore.currentCategory.name }}</h1>
          <div v-if="authStore.isAuthenticated && isOwnCategory" class="flex space-x-2">
            <button @click="editModalOpen = true"
              class="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              {{ t('categoryView.editCategoryBtn') }}
            </button>
            <button @click="openDeleteDialog"
              class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
              {{ t('categoryView.deleteBtn') }}
            </button>
          </div>
        </div>

        <p v-if="categoryStore.currentCategory.description" class="text-gray-500 dark:text-gray-400 mb-4">
          {{ categoryStore.currentCategory.description }}
        </p>

        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{{ t('categoryView.sectionHeading') }}</h2>

        <div v-if="promptStore.loading" class="text-gray-500 dark:text-gray-400 py-4">
          <span>{{ t('common.loading') }}</span>
        </div>

        <div v-else-if="promptStore.prompts.length === 0" class="text-gray-500 italic">
          <span class="text-gray-500 dark:text-gray-400">{{ t('categoryView.noPromptsInCat') }}</span>
        </div>

        <div v-else class="space-y-4">
          <PromptCard v-for="prompt in promptStore.prompts" :key="prompt._id" :prompt="prompt" />
          <div v-if="promptStore.hasMore" class="text-center">
            <button @click="promptStore.loadMore()" :disabled="promptStore.loadingMore"
              class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
              {{ promptStore.loadingMore ? t('common.loading') : t('promptList.loadMore') }}
            </button>
          </div>
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {{ t('date.created') }} {{ new Date(categoryStore.currentCategory.createdAt).toLocaleDateString() }}
        </p>
      </div>

      <!-- Edit Category Modal -->
      <CreateCategoryModal v-if="editModalOpen" :editing="categoryStore.currentCategory"
        @close="editModalOpen = false" />
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-gray-400">{{ t('promptDetail.notFound') }}</p>
      <router-link to="/" class="text-indigo-600 dark:text-indigo-400 hover:underline">{{ t('categoryView.backLink') }}</router-link>
    </div>

      <!-- Delete Confirmation Modal -->
      <DeleteConfirmationModal v-if="deleteDialogOpen" entity-type="'category'" :entity-id="pendingDeleteId"
        @close="deleteDialogOpen = false; pendingDeleteId = null"
        @confirm="handleDeleteConfirm" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCategoryStore } from '../stores/useCategoryStore'
import { usePromptStore } from '../stores/usePromptStore'
import { useUIStore } from '../stores/useUIStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import PromptCard from '../components/PromptCard.vue'
import CreateCategoryModal from '../components/CreateCategoryModal.vue'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.vue'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()
const promptStore = usePromptStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const editModalOpen = ref(false)
const deleteDialogOpen = ref(false)
const pendingDeleteId = ref(null)

function isOwnCategory() {
  if (!authStore.isAuthenticated || !categoryStore.currentCategory) return false
  return authStore.isOwner(categoryStore.currentCategory.ownerId)
}

onMounted(async () => {
  try {
    // The prompt store is shared with the list view: scope it to this
    // category so the server (not a local window of the global list)
    // decides which prompts are shown.
    await Promise.all([
      categoryStore.fetchCategory(route.params.id),
      promptStore.setFilters({ q: '', categoryId: route.params.id, tags: [] })
    ])
  } catch (error) {
    uiStore.setError(error.message)
  }
})

function openDeleteDialog() {
  pendingDeleteId.value = route.params.id
  deleteDialogOpen.value = true
}

function handleDeleteConfirm(id) {
  categoryStore.deleteCategory(id).then(() => {
    // Soft navigation: a full page reload (the old window.location.href)
    // would re-fetch everything for no reason.
    router.push('/')
  }).catch(err => {
    uiStore.setError(err.message)
  })
}
</script>
