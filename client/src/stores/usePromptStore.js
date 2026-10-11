import { defineStore } from 'pinia'
import { promptsApi } from '../api/index.js'
import {
  buildExportZip,
  exportZipName,
  downloadBlob,
  readImportFile,
  normalizeImportEntries,
  toApiEntry,
  toApiEntries
} from '../lib/promptBackup.js'

// Page size for the list. The server serves a lightweight row per prompt
// (metadata + 200-char excerpt), so 50 is a comfortable grid page.
const PAGE_SIZE = 50

// Default filters = "no filter". categoryId is the literal 'none' for
// the uncategorized view (see promptController.buildListFilter).
const EMPTY_FILTERS = { q: '', categoryId: '', tags: [] }

// Identity of the in-flight list request, kept outside the reactive state
// (an AbortController must not be proxied by Pinia). A monotonically
// increasing sequence plus the latest request's controller: when a newer
// list request starts, the older one is aborted, and any late response
// from a superseded request is dropped instead of clobbering the list.
let listSequence = 0
let activeListController = null

export const usePromptStore = defineStore('prompts', {
  state: () => ({
    prompts: [],
    currentPrompt: null,
    loading: false,
    loadingMore: false,
    total: 0,
    page: 1,
    filters: { ...EMPTY_FILTERS, tags: [] },
    // Export/import flow (SPEC §2.2a): the file's rows awaiting user
    // decisions, the server-reported quota, and the in-flight apply flag.
    importEntries: [],
    importQuota: null,
    importFileName: '',
    importing: false
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
      // A new list request supersedes the in-flight one: abort it and mark
      // this request as the latest (the sequence guards the state writes).
      activeListController?.abort()
      const controller = new AbortController()
      activeListController = controller
      const sequence = ++listSequence

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
        const data = await promptsApi.getAll(params, { signal: controller.signal })
        // Superseded by a newer request while in flight: drop the result.
        if (sequence !== listSequence) return this.prompts
        // The server returns { prompts, total, page, limit, hasMore }.
        // An array (legacy shape) is tolerated for tests/mocks.
        const rows = Array.isArray(data) ? data : (data.prompts ?? [])
        this.prompts = reset ? rows : this.prompts.concat(rows)
        this.total = Array.isArray(data) ? data.length : (data.total ?? rows.length)
        if (!reset) this.page = page + 1 // advance for the next loadMore
        return this.prompts
      } catch (error) {
        // Aborted because a newer request superseded us: ignore silently.
        if (error?.name === 'AbortError') return this.prompts
        throw new Error(error.message, { cause: error })
      } finally {
        // Only the latest request clears the flags — an aborted (older)
        // one must not wipe the newer request's loading state.
        if (sequence === listSequence) {
          this.loading = false
          this.loadingMore = false
        }
        if (activeListController === controller) {
          activeListController = null
        }
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
    },

    // --- Export / Import (SPEC §2.2a) ---

    /**
     * Downloads the user's prompts as a ZIP (prompts.json inside).
     * Resolves { count } — 0 when the account has no prompts.
     */
    async exportPrompts() {
      const payload = await promptsApi.export()
      if (!payload.prompts.length) return { count: 0 }
      const blob = await buildExportZip(payload)
      downloadBlob(blob, exportZipName())
      return { count: payload.prompts.length }
    },

    /**
     * First import phase: parse the file, pre-validate, and ask the server
     * to classify each prompt (new / conflict) against the importer's own
     * account. The result is stored as importEntries for the modal.
     */
    async prepareImport(file) {
      const payload = await readImportFile(file)
      const { entries } = normalizeImportEntries(payload)

      // Only locally-valid rows go to the server; its classification (which
      // is authoritative — it re-checks ownership and quota) is merged back.
      // NOTE: the server indexes results by position in the SENT array, so
      // the merge zips against the valid-only subset (order-preserving).
      const okEntries = entries.filter((e) => e.status === 'ok')
      const res = await promptsApi.import({ dryRun: true, prompts: toApiEntries(entries) })
      const byApiIndex = new Map(res.results.map((r) => [r.index, r]))
      const okMeta = okEntries.map((_, i) => {
        const server = byApiIndex.get(i)
        // UI vocabulary: the server's "conflict" is an existing prompt the
        // user may choose to overwrite.
        const status = server?.status === 'conflict' ? 'exists' : (server?.status ?? 'new')
        return {
          status,
          existingId: server?.existingId ?? null,
          existingTitle: server?.existingTitle ?? null
        }
      })

      let okPos = -1
      this.importEntries = entries.map((entry) => {
        if (entry.status !== 'ok') {
          // Resolved client-side; never part of the API payload.
          return { ...entry, sent: false, selected: false }
        }
        okPos += 1
        const meta = okMeta[okPos]
        return { ...entry, sent: true, ...meta, selected: meta.status === 'new' }
      })
      this.importQuota = res.quota
      this.importFileName = file.name
      return this.importEntries
    },

    /**
     * Second import phase: apply. `conflictIndexes` are positions into
     * importEntries of the conflicts the user approved for overwriting;
     * they are remapped to the positions of the sent (valid-only) array.
     */
    async confirmImport(conflictIndexes = []) {
      this.importing = true
      try {
        const sentEntries = this.importEntries.filter((e) => e.sent)
        const overwrites = conflictIndexes
          .map((i) => sentEntries.indexOf(this.importEntries[i]))
          .filter((i) => i !== -1)
        const res = await promptsApi.import({
          dryRun: false,
          prompts: sentEntries.map((e) => toApiEntry(e)),
          overwrites
        })
        this.cancelImport()
        return { created: res.created, updated: res.updated, skipped: res.skipped }
      } finally {
        this.importing = false
      }
    },

    cancelImport() {
      this.importEntries = []
      this.importQuota = null
      this.importFileName = ''
      this.importing = false
    }
  }
})
