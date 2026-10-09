<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-0">{{ t('promptList.heading') }}</h1>
      <div v-if="authStore.isAuthenticated" class="flex space-x-3">
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

    <!-- Search -->
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

      <!-- Prompts list -->
      <div class="flex-1">
        <div v-if="promptStore.loading" class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-400">{{ t('promptList.loading') }}</p>
        </div>

        <div v-else-if="filteredPrompts.length === 0" class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-400">{{ t('promptList.noPrompts') }}</p>
        </div>

        <div v-else class="space-y-4">
          <PromptCard
            v-for="prompt in filteredPrompts"
            :key="prompt._id"
            :prompt="prompt"
            @filterByCategory="onFilterByCategory"
            @filterByTag="onFilterByTag"
          />
        </div>
      </div>
    </div>

    <!-- Create Prompt Modal -->
    <CreatePromptModal v-if="uiStore.showCreatePromptModal" @close="uiStore.setShowCreatePromptModal(false)" @saved="() => { uiStore.setShowCreatePromptModal(false); promptStore.fetchPrompts(); }" />

    <!-- Create Category Modal -->
    <CreateCategoryModal v-if="uiStore.showCreateCategoryModal" :editing="uiStore.editingCategory" @close="onCategoryModalClose" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePromptStore } from '../stores/usePromptStore'
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import SearchBar from '../components/SearchBar.vue'
import CategoryList from '../components/CategoryList.vue'
import PromptCard from '../components/PromptCard.vue'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import CreateCategoryModal from '../components/CreateCategoryModal.vue'

const promptStore = usePromptStore()
const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const searchQuery = ref('')
const selectedTags = ref([])

function onCategoryModalClose() {
  uiStore.setEditingCategory(null)
  uiStore.setShowCreateCategoryModal(false)
  categoryStore.fetchCategories()
}

function onFilterByCategory(catName) {
  const uncategorizedLabel = t('createPromptModal.uncategorized')
  if (catName === uncategorizedLabel) {
    categoryStore.selectCategory('__uncategorized__')
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

function clearAllTags() {
  selectedTags.value = []
}

function removeTag(tag) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx !== -1) {
    selectedTags.value.splice(idx, 1)
  }
}

const filteredPrompts = computed(() => {
  let result = promptStore.prompts

  // Filter by search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    )
  }

  // Filter by selected category (including virtual __uncategorized__)
  if (categoryStore.selectedCategoryId) {
    const isUncat = categoryStore.selectedCategoryId === '__uncategorized__'
    if (isUncat) {
      result = result.filter(p => !p.categoryId || p.categoryId === '')
    } else {
      result = result.filter(p => p.categoryId?._id === categoryStore.selectedCategoryId)
    }
  }

  // AND-filter by selected tags
  if (selectedTags.value.length > 0) {
    result = result.filter(p =>
      selectedTags.value.every(tag => p.tags && p.tags.includes(tag))
    )
  }

  return result
})

onMounted(async () => {
  try {
    await Promise.all([
      promptStore.fetchPrompts(),
      categoryStore.fetchCategories()
    ])
  } catch (error) {
    uiStore.setError(error.message)
  }
})
</script>
