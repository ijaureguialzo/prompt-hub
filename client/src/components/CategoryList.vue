<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <h2 class="text-lg font-semibold text-gray-900 mb-3">Categories</h2>

    <div v-if="categoryStore.loading" class="text-sm text-gray-500">Loading...</div>

    <ul v-else class="space-y-1">
      <li>
        <button @click="categoryStore.clearSelection()"
          :class="[
            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
            !categoryStore.selectedCategoryId
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          ]">
          All Categories
        </button>
      </li>

      <li v-for="cat in categoryStore.categories" :key="cat._id">
        <div class="flex items-center group">
          <button @click="categoryStore.selectCategory(cat._id)"
            :class="[
              'flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate',
              categoryStore.selectedCategoryId === cat._id
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            ]">
            {{ cat.name }}
          </button>
          <div class="flex opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="openEditCategory(cat)" class="p-1 text-gray-400 hover:text-indigo-600" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-5.007l-4 4" />
              </svg>
            </button>
            <button @click="confirmDeleteCategory(cat._id)" class="p-1 text-gray-400 hover:text-red-600" title="Delete">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </li>

      <li v-if="categoryStore.categories.length === 0" class="text-sm text-gray-400 italic py-2">
        No categories yet.
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useCategoryStore } from '../stores/useCategoryStore'
import { useUIStore } from '../stores/useUIStore'

const categoryStore = useCategoryStore()
const uiStore = useUIStore()

function openEditCategory(category) {
  // Emit event for parent to handle modal
  window.dispatchEvent(new CustomEvent('edit-category', { detail: category }))
}

function confirmDeleteCategory(id) {
  if (confirm('Delete this category? Prompts in it will be affected.')) {
    categoryStore.deleteCategory(id).catch(err => {
      uiStore.setError(err.message)
    })
  }
}
</script>
