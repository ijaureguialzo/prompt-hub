<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-0">{{ t('promptList.heading') }}</h1>
      <div v-if="authStore.isAuthenticated" class="flex space-x-3">
        <button
          @click="onExport"
          :disabled="exporting"
          class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50"
        >
          {{ exporting ? t('promptList.exporting') : t('promptList.exportBtn') }}
        </button>
        <button
          @click="onImportClick"
          class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm font-medium"
        >
          {{ t('promptList.importBtn') }}
        </button>
        <button
          @click="uiStore.setShowCreateCategoryModal(true)"
          class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm font-medium"
        >
          {{ t('promptList.newCategoryBtn') }}
        </button>
        <button
          @click="uiStore.setShowCreatePromptModal(true)"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 text-sm font-medium"
        >
          {{ t('promptList.newPromptBtn') }}
        </button>
      </div>
    </div>

    <!-- Search (debounced, applied server-side) -->
    <SearchBar v-model="searchQuery" />

    <!-- Tag filter bar -->
    <div v-if="selectedTags.length > 0" class="mt-4 flex flex-wrap items-center gap-2">
      <span class="text-sm text-gray-500 dark:text-gray-400 mr-1">{{ t('promptList.filteredByTags') }}:</span>
      <button v-for="tag in selectedTags" :key="tag" @click="removeTag(tag)"
        class="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full text-sm font-semibold border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-200/80 dark:hover:bg-indigo-800/60">
        {{ tag }}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button @click="clearAllTags" class="text-sm text-red-400 hover:text-red-300 font-medium">
        {{ t('promptList.clearAllTags') }}
      </button>
    </div>

    <!-- Content -->
    <div class="mt-6 flex flex-col lg:flex-row gap-6">
      <!-- Categories sidebar -->
      <div class="lg:w-64 flex-shrink-0">
        <CategoryList />
      </div>

      <!-- Prompts list (filtered + paginated server-side) -->
      <div class="flex-1">
        <div v-if="promptStore.loading" class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-400">{{ t('promptList.loading') }}</p>
        </div>

        <div v-else-if="promptStore.prompts.length === 0" class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-400">{{ t('promptList.noPrompts') }}</p>
        </div>

        <div v-else>
          <div class="space-y-4">
            <PromptCard
              v-for="prompt in promptStore.prompts"
              :key="prompt._id"
              :prompt="prompt"
              @filterByCategory="onFilterByCategory"
              @filterByTag="onFilterByTag"
            />
          </div>

          <!-- Load more (server-side pagination) -->
          <div v-if="promptStore.hasMore" class="mt-4 text-center">
            <button
              @click="promptStore.loadMore()"
              :disabled="promptStore.loadingMore"
              class="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {{ promptStore.loadingMore ? t('common.loading') : t('promptList.loadMore') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Prompt Modal -->
    <CreatePromptModal v-if="uiStore.showCreatePromptModal" @close="uiStore.setShowCreatePromptModal(false)" @saved="() => { uiStore.setShowCreatePromptModal(false); promptStore.setFilters(currentFilters()) }" />

    <!-- Create Category Modal -->
    <CreateCategoryModal v-if="uiStore.showCreateCategoryModal" :editing="uiStore.editingCategory" @close="onCategoryModalClose" />

    <!-- Import Prompts Modal (file selection happens above) -->
    <ImportPromptsModal
      v-if="showImportModal"
      :entries="promptStore.importEntries"
      :quota="promptStore.importQuota"
      :categories="promptStore.importCategories?.toCreate ?? null"
      :importing="promptStore.importing"
      :file-name="promptStore.importFileName"
      @close="onImportModalClose"
      @confirm="onImportConfirm"
    />

    <!-- Hidden file input driving the import flow (.zip or .json) -->
    <input ref="fileInput" type="file" accept=".zip,.json,application/zip,application/json" class="hidden" @change="onImportFileChosen" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { usePromptStore } from '../stores/usePromptStore'
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import { IMPORT_FILE_MAX_SIZE } from '../lib/promptBackup.js'
import SearchBar from '../components/SearchBar.vue'
import CategoryList from '../components/CategoryList.vue'
import PromptCard from '../components/PromptCard.vue'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import CreateCategoryModal from '../components/CreateCategoryModal.vue'
import ImportPromptsModal from '../components/ImportPromptsModal.vue'

const promptStore = usePromptStore()
const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const searchQuery = ref('')
const selectedTags = ref([])
const fileInput = ref(null)
const showImportModal = ref(false)
const exporting = ref(false)

const UNCAT_ID = '__uncategorized__'
const SEARCH_DEBOUNCE_MS = 300

function onCategoryModalClose() {
  uiStore.setEditingCategory(null)
  uiStore.setShowCreateCategoryModal(false)
  categoryStore.fetchCategories()
}

// The prompt store's filters, driven by this view's UI state.
function currentFilters() {
  const cat = categoryStore.selectedCategoryId
  return {
    q: searchQuery.value,
    // The virtual uncategorized selection maps to the server's 'none'
    categoryId: cat === UNCAT_ID ? 'none' : cat || '',
    tags: selectedTags.value
  }
}

// Re-apply the filters (debounced for typing, immediate for clicks).
let searchTimer = null
function applyFilters() {
  promptStore.setFilters(currentFilters()).catch((err) => {
    uiStore.setError(err.message)
  })
}

function scheduleFilterChange() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, SEARCH_DEBOUNCE_MS)
}

watch(searchQuery, scheduleFilterChange)
watch(
  () => categoryStore.selectedCategoryId,
  applyFilters
)
watch(selectedTags, applyFilters, { deep: true })

function onFilterByCategory(catName) {
  const uncategorizedLabel = t('createPromptModal.uncategorized')
  if (catName === uncategorizedLabel) {
    categoryStore.selectCategory(UNCAT_ID)
    selectedTags.value = []
  } else {
    const cat = categoryStore.categories.find(c => c.name === catName)
    if (cat) {
      categoryStore.selectCategory(cat._id)
      selectedTags.value = []
    }
  }
}

function onFilterByTag(tag) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(idx, 1)
  }
}

// --- Export / Import (SPEC §2.2a) ---

async function onExport() {
  if (exporting.value) return
  exporting.value = true
  try {
    const { count } = await promptStore.exportPrompts()
    if (count === 0) {
      uiStore.setError(t('promptList.exportEmpty'))
    } else {
      uiStore.setSuccess(t('common.exportSuccess', { count }))
    }
  } catch (error) {
    uiStore.setError(error.message)
  } finally {
    exporting.value = false
  }
}

function onImportClick() {
  fileInput.value?.click()
}

async function onImportFileChosen(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // allow picking the same file again
  if (!file) return
  try {
    await promptStore.prepareImport(file)
    showImportModal.value = true
  } catch (error) {
    // Unreadable / malformed file: localized message per stable code (the
    // typed error keeps an English message for logging/fallback only).
    if (error?.name === 'ImportFileError') {
      const message =
        error.code === 'TOO_LARGE'
          ? t('errors.importFileTooLarge', { maxMb: IMPORT_FILE_MAX_SIZE / 1024 / 1024 })
          : t('common.importFileError')
      uiStore.setError(message)
    } else {
      uiStore.setError(error.message)
    }
  }
}

function onImportModalClose() {
  showImportModal.value = false
  promptStore.cancelImport()
}

async function onImportConfirm(overwrites) {
  try {
    const summary = await promptStore.confirmImport(overwrites)
    showImportModal.value = false
    uiStore.setSuccess(t('common.importSuccess', summary))
    // Reconcile the list with whatever was created/updated.
    promptStore.setFilters(currentFilters()).catch((err) => {
      uiStore.setError(err.message)
    })
    // The sidebar's categories (and their prompt counts) are stale after an
    // import that created missing categories — refresh them too.
    categoryStore.fetchCategories().catch((err) => {
      uiStore.setError(err.message)
    })
  } catch (error) {
    // The modal stays open (store keeps its state) so the user can adjust.
    uiStore.setError(error.message)
  }
}

function clearAllTags() {
  selectedTags.value = []
}

function removeTag(tag) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx !== -1) {
    selectedTags.value.splice(idx, 1)
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      promptStore.setFilters(currentFilters()),
      categoryStore.fetchCategories()
    ])
  } catch (error) {
    uiStore.setError(error.message)
  }
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>
