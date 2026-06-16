import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    error: null,
    successMessage: null,
    showCreatePromptModal: false,
    showCreateCategoryModal: false,
  }),

  actions: {
    setError(message) {
      this.error = message
      setTimeout(() => { this.error = null }, 5000)
    },

    setSuccess(message) {
      this.successMessage = message
      setTimeout(() => { this.successMessage = null }, 3000)
    },

    clearError() {
      this.error = null
    },

    setShowCreatePromptModal(show) {
      this.showCreatePromptModal = show
    },

    setShowCreateCategoryModal(show) {
      this.showCreateCategoryModal = show
    },
  },
})
