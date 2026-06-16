import { defineStore } from 'pinia'
import { categoriesApi } from '../api/index.js'

export const useCategoryStore = defineStore('categories', {
  state: () => ({
    categories: [],
    currentCategory: null,
    selectedCategoryId: null,
    loading: false,
  }),

  getters: {
    selectedCategory: (state) => {
      if (!state.selectedCategoryId) return null
      return state.categories.find(c => c._id === state.selectedCategoryId) || null
    },
  },

  actions: {
    async fetchCategories() {
      this.loading = true
      try {
        this.categories = await categoriesApi.getAll()
      } catch (error) {
        throw new Error(error.message)
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
        throw new Error(error.message)
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
      const index = this.categories.findIndex(c => c._id === id)
      if (index !== -1) {
        this.categories[index] = category
      }
      return category
    },

    async deleteCategory(id) {
      await categoriesApi.delete(id)
      this.categories = this.categories.filter(c => c._id !== id)
      if (this.selectedCategoryId === id) {
        this.selectedCategoryId = null
      }
    },

    selectCategory(id) {
      this.selectedCategoryId = id
    },

    clearSelection() {
      this.selectedCategoryId = null
    },
  },
})
