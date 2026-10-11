import { defineStore } from 'pinia'

// Per-type lifetime of a toast. Each toast runs its OWN timer: a newer
// toast is never killed by an older one's clock (the old single-slot
// store let a second toast disappear when the first expired).
const TOAST_DURATION = {
  error: 5000,
  success: 3000
}

// Monotonic toast ids (non-reactive, module scope).
let toastId = 0

export const useUIStore = defineStore('ui', {
  state: () => ({
    // Queue of { id, type: 'success' | 'error', message }
    toasts: [],
    showCreatePromptModal: false,
    showCreateCategoryModal: false,
    editingCategory: null
  }),

  actions: {
    pushToast(type, message) {
      const toast = { id: ++toastId, type, message }
      this.toasts.push(toast)
      // Expire by id: safe no-op if the toast was already removed.
      setTimeout(() => this.removeToast(toast.id), TOAST_DURATION[type])
      return toast
    },

    setError(message) {
      return this.pushToast('error', message)
    },

    setSuccess(message) {
      return this.pushToast('success', message)
    },

    removeToast(id) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id)
    },

    clearError() {
      this.toasts = this.toasts.filter((toast) => toast.type !== 'error')
    },

    setShowCreatePromptModal(show) {
      this.showCreatePromptModal = show
    },

    setShowCreateCategoryModal(show) {
      this.showCreateCategoryModal = show
    },

    setEditingCategory(category) {
      this.editingCategory = category
    }
  }
})
