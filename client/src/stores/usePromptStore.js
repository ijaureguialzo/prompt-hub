import { defineStore } from 'pinia'
import { promptsApi } from '../api/index.js'

// Page size for the list. The server serves a lightweight row per prompt
// (metadata + 200-char excerpt), so 50 is a comfortable grid page.
const PAGE_SIZE = 50

// Default filters = "no filter". categoryId is the literal 'none' for
// the uncategorized view (see promptController.buildListFilter).
const EMPTY_FILTERS = { q: '', categoryId: '', tags: [] }

export const usePromptStore = defineStore('prompts', {
  state: () => ({
    prompts: [],
    currentPrompt: null,
    loading: false,
    loadingMore: false,
    total: 0,
    page: 1,
    filters: { ...EMPTY_FILTERS, tags: [] }
  }),

  getters: {
    hasMore: (state) => state.prompts.length < state.total
  },

  actions: {
    /**
     * Replace the active filters and re-fetch from page 1.
     * Partial objects merge onto the previous filters, so a view can
     * own only the part of the filter it controls.
     */
    async setFilters(partial = {}) {
      this.filters = { ...EMPTY_FILTERS, tags: [], ...partial }
      this.page = 1
      await this.fetchPrompts({ reset: true })
    },

    async fetchPrompts({ reset = true } = {}) {
      if (reset) {
        this.loading = true
        this.page = 1
      } else {
        this.loadingMore = true
      }
      const page = this.page
      try {
        const params = {
          page,
          limit: PAGE_SIZE,
          q: this.filters.q,
          categoryId: this.filters.categoryId,
          tag: this.filters.tags
        }
        const data = await promptsApi.getAll(params)
        // The server returns { prompts, total, page, limit, hasMore }.
        // An array (legacy shape) is tolerated for tests/mocks.
        const rows = Array.isArray(data) ? data : (data.prompts ?? [])
        this.prompts = reset ? rows : this.prompts.concat(rows)
        this.total = Array.isArray(data) ? data.length : (data.total ?? rows.length)
        if (!reset) this.page = page + 1 // advance for the next loadMore
        return this.prompts
      } catch (error) {
        throw new Error(error.message, { cause: error })
      } finally {
        this.loading = false
        this.loadingMore = false
      }
    },

    /** Append the next page (drives the "Load more" button). */
    async loadMore() {
      if (!this.hasMore || this.loading || this.loadingMore) return
      await this.fetchPrompts({ reset: false })
    },

    async fetchPrompt(id) {
      this.loading = true
      try {
        this.currentPrompt = await promptsApi.getById(id)
        return this.currentPrompt
      } catch (error) {
        throw new Error(error.message, { cause: error })
      } finally {
        this.loading = false
      }
    },

    async createPrompt(promptData) {
      const prompt = await promptsApi.create(promptData)
      // Newest first: the new prompt appears at the top of the current
      // view. (If the active filters would exclude it, the next refetch
      // from the server reconciles the list.)
      this.prompts.unshift(prompt)
      this.total += 1
      return prompt
    },

    async updatePrompt(id, promptData) {
      const prompt = await promptsApi.update(id, promptData)
      const index = this.prompts.findIndex((p) => p._id === id)
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
      this.prompts = this.prompts.filter((p) => p._id !== id)
      this.total = Math.max(0, this.total - 1)
      if (this.currentPrompt?._id === id) {
        this.currentPrompt = null
      }
    },

    clearCurrent() {
      this.currentPrompt = null
    }
  }
})
