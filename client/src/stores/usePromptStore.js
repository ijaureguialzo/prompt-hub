import { defineStore } from 'pinia'
import { promptsApi } from '../api/index.js'

export const usePromptStore = defineStore('prompts', {
  state: () => ({
    prompts: [],
    currentPrompt: null,
    loading: false,
  }),

  actions: {
    async fetchPrompts() {
      this.loading = true
      try {
        this.prompts = await promptsApi.getAll()
      } catch (error) {
        throw new Error(error.message)
      } finally {
        this.loading = false
      }
    },

    async fetchPrompt(id) {
      this.loading = true
      try {
        this.currentPrompt = await promptsApi.getById(id)
        return this.currentPrompt
      } catch (error) {
        throw new Error(error.message)
      } finally {
        this.loading = false
      }
    },

    async createPrompt(promptData) {
      const prompt = await promptsApi.create(promptData)
      this.prompts.unshift(prompt)
      return prompt
    },

    async updatePrompt(id, promptData) {
      const prompt = await promptsApi.update(id, promptData)
      const index = this.prompts.findIndex(p => p._id === id)
      if (index !== -1) {
        this.prompts[index] = prompt
      }
      if (this.currentPrompt?._id === id) {
        this.currentPrompt = prompt
      }
      return prompt
    },

    async deletePrompt(id) {
      await promptsApi.delete(id)
      this.prompts = this.prompts.filter(p => p._id !== id)
      if (this.currentPrompt?._id === id) {
        this.currentPrompt = null
      }
    },

    clearCurrent() {
      this.currentPrompt = null
    },
  },
})
