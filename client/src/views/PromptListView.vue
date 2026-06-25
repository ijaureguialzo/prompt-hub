<template>
  <div>
    <!-- Toast notifications -->
    <Toast />

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">{{ t('promptList.heading') }}</h1>
      <div class="flex space-x-3">
        <button
          @click="uiStore.setShowCreateCategoryModal(true)"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
        >
          {{ t('promptList.newCategoryBtn') }}
        </button>
        <button
          @click="uiStore.setShowCreatePromptModal(true)"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          {{ t('promptList.newPromptBtn') }}
        </button>
      </div>
    </div>

    <!-- Search -->
    <SearchBar v-model="searchQuery" />

    <!-- Content -->
    <div class="mt-6 flex flex-col lg:flex-row gap-6">
      <!-- Categories sidebar -->
      <div class="lg:w-64 flex-shrink-0">
        <CategoryList />
      </div>

      <!-- Prompts list -->
      <div class="flex-1">
        <div v-if="promptStore.loading" class="text-center py-8">
          <p class="text-gray-500">{{ t('promptList.loading') }}</p>
        </div>

        <div v-else-if="filteredPrompts.length === 0" class="text-center py-8">
          <p class="text-gray-500">{{ t('promptList.noPrompts') }}</p>
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
    <CreateCategoryModal v-if="uiStore.showCreateCategoryModal" :editing="editingCategory" @close="onCategoryModalClose" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePromptStore } from '../stores/usePromptStore'
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import SearchBar from '../components/SearchBar.vue'
import CategoryList from '../components/CategoryList.vue'
import PromptCard from '../components/PromptCard.vue'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import CreateCategoryModal from '../components/CreateCategoryModal.vue'
import Toast from '../components/Toast.vue'

const promptStore = usePromptStore()
const categoryStore = useCategoryStore()
const uiStore = useUIStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const searchQuery = ref('')
const editingCategory = ref(null)
const selectedTags = ref([])

function onCategoryModalClose() {
  editingCategory.value = null
  uiStore.setShowCreateCategoryModal(false)
  categoryStore.fetchCategories()
}

const handleEditCategory = (event) => {
  editingCategory.value = event.detail
  uiStore.setShowCreateCategoryModal(true)
}

window.addEventListener('edit-category', handleEditCategory)

function onFilterByCategory(catName) {
  const cat = categoryStore.categories.find(c => c.name === catName)
  if (cat) {
    categoryStore.selectCategory(cat._id)
    selectedTags.value = []
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

  // Filter by selected category
  if (categoryStore.selectedCategoryId) {
    result = result.filter(p => p.categoryId?._id === categoryStore.selectedCategoryId)
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

onUnmounted(() => {
  window.removeEventListener('edit-category', handleEditCategory)
})
</script>
