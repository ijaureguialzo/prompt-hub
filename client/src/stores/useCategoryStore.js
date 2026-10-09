import { defineStore } from 'pinia'
import { categoriesApi } from '../api/index.js'

export const useCategoryStore = defineStore('categories', {
  state: () => ({
    categories: [],
    currentCategory: null,
    selectedCategoryId: null,
    loading: false,
    // Server-side counts (from GET /api/categories): the sidebar must show
    // accurate numbers even though the prompt list is paginated.
    uncategorizedCount: 0,
    totalPrompts: 0
  }),

  getters: {
    selectedCategory: (state) => {
      if (!state.selectedCategoryId) return null
      return state.categories.find((c) => c._id === state.selectedCategoryId) || null
    }
  },

  actions: {
    async fetchCategories() {
      this.loading = true
      try {
        // The server returns { categories, uncategorizedCount, totalPrompts }.
        // Each category carries a denormalized promptCount.
        const data = await categoriesApi.getAll()
        // An array (legacy shape) is tolerated for tests/mocks.
        if (Array.isArray(data)) {
          this.categories = data
        } else {
          this.categories = data.categories ?? []
          this.uncategorizedCount = data.uncategorizedCount ?? 0
          this.totalPrompts = data.totalPrompts ?? 0
        }
        return this.categories
      } catch (error) {
        throw new Error(error.message, { cause: error })
      } finally {
        this.loading = false
      }
    },

    async fetchCategory(id) {
      this.loading = true
      try {
        this.currentCategory = await categoriesApi.getById(id)
        return this.currentCategory
      } catch (error) {
        throw new Error(error.message, { cause: error })
      } finally {
        this.loading = false
      }
    },

    async createCategory(categoryData) {
      const category = await categoriesApi.create(categoryData)
      this.categories.unshift(category)
      return category
    },

    async updateCategory(id, categoryData) {
      const category = await categoriesApi.update(id, categoryData)
      const index = this.categories.findIndex((c) => c._id === id)
      if (index !== -1) {
        this.categories[index] = category
      }
      return category
    },

    async deleteCategory(id) {
      await categoriesApi.delete(id)
      this.categories = this.categories.filter((c) => c._id !== id)
      if (this.selectedCategoryId === id) {
        this.selectedCategoryId = null
      }
      // The server-side counts (promptCount / totalPrompts) are stale now —
      // callers refresh via fetchCategories().
    },

    selectCategory(id) {
      this.selectedCategoryId = id
    },

    clearSelection() {
      this.selectedCategoryId = null
    }
  }
})
