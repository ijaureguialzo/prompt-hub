<template>
  <div v-if="categoryStore.loading" class="text-center py-8">
    <p class="text-gray-500">Loading category...</p>
  </div>

  <div v-else-if="categoryStore.currentCategory" class="max-w-4xl mx-auto">
    <router-link to="/" class="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Prompts
    </router-link>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold text-gray-900">{{ categoryStore.currentCategory.name }}</h1>
        <div class="flex space-x-2">
          <button @click="editModalOpen = true"
            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
            Edit Category
          </button>
          <button @click="confirmDelete"
            class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>

      <p v-if="categoryStore.currentCategory.description" class="text-gray-600 mb-4">
        {{ categoryStore.currentCategory.description }}
      </p>

      <h2 class="text-lg font-semibold text-gray-900 mb-3">Prompts in this category</h2>

      <div v-if="categoryPrompts.length === 0" class="text-gray-500 italic">
        No prompts in this category yet.
      </div>

      <div v-else class="space-y-4">
        <PromptCard v-for="prompt in categoryPrompts" :key="prompt._id" :prompt="prompt" />
      </div>

      <p class="text-xs text-gray-400 mt-4">
        Created: {{ new Date(categoryStore.currentCategory.createdAt).toLocaleDateString() }}
      </p>
    </div>

    <!-- Edit Category Modal -->
    <CreateCategoryModal v-if="editModalOpen" :editing="categoryStore.currentCategory"
      @close="editModalOpen = false" />
  </div>

  <div v-else class="text-center py-8">
    <p class="text-gray-500">Category not found.</p>
    <router-link to="/" class="text-indigo-600 hover:underline">Back to Prompts</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useCategoryStore } from '../stores/useCategoryStore'
import { usePromptStore } from '../stores/usePromptStore'
import { useUIStore } from '../stores/useUIStore'
import PromptCard from '../components/PromptCard.vue'
import CreateCategoryModal from '../components/CreateCategoryModal.vue'

const route = useRoute()
const categoryStore = useCategoryStore()
const promptStore = usePromptStore()
const uiStore = useUIStore()

const editModalOpen = ref(false)

const categoryPrompts = computed(() =>
  promptStore.prompts.filter(p => p.categoryId?._id === route.params.id)
)

onMounted(async () => {
  try {
    await Promise.all([
      categoryStore.fetchCategory(route.params.id),
      promptStore.fetchPrompts()
    ])
  } catch (error) {
    uiStore.setError(error.message)
  }
})

function confirmDelete() {
  if (confirm('Delete this category?')) {
    categoryStore.deleteCategory(route.params.id).then(() => {
      window.location.href = '/'
    }).catch(err => {
      uiStore.setError(err.message)
    })
  }
}
</script>
