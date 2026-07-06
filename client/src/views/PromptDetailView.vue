<template>
  <div class="relative">
    <div v-if="promptStore.loading" class="text-center py-8">
      <p class="text-gray-500 dark:text-gray-400">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="promptStore.currentPrompt" class="max-w-4xl mx-auto">
    <router-link to="/" class="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4 dark:text-indigo-400 dark:hover:text-indigo-300">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ t('promptDetail.backLink') }}
      </router-link>

      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ promptStore.currentPrompt.title }}</h1>
          <div class="flex space-x-2 mt-3 sm:mt-0">
            <button @click="copyToClipboard(promptStore.currentPrompt.content)"
              class="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              {{ t('promptDetail.copyBtn') }}
            </button>
            <button @click="usePromptOpen = true"
              class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
              {{ t('promptDetail.useBtn') }}
            </button>
            <template v-if="authStore.isAuthenticated && isOwnPrompt">
              <button @click="editorOpen = true"
                class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                {{ t('promptDetail.editBtn') }}
              </button>
              <button @click="openDeleteDialog"
                class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                {{ t('promptDetail.deleteBtn') }}
              </button>
            </template>
          </div>
        </div>

        <div class="mb-4">
          <span v-if="promptStore.currentPrompt.categoryId"
            class="inline-block px-3 py-1 text-sm font-medium bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded-full">
            <router-link :to="`/category/${promptStore.currentPrompt.categoryId._id}`">
              {{ promptStore.currentPrompt.categoryId.name }}
            </router-link>
          </span>
          <span v-else class="inline-block px-3 py-1 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
            {{ t('createPromptModal.uncategorized') }}
          </span>
        </div>

        <pre class="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">{{ promptStore.currentPrompt.content }}</pre>

        <div v-if="promptStore.currentPrompt.tags && promptStore.currentPrompt.tags.length" class="mt-4 flex flex-wrap gap-2">
          <span v-for="tag in promptStore.currentPrompt.tags" :key="tag"
            class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600">
            {{ tag }}
          </span>
        </div>

        <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {{ t('date.created') }} {{ new Date(promptStore.currentPrompt.createdAt).toLocaleDateString() }}
          <span v-if="promptStore.currentPrompt.updatedAt && promptStore.currentPrompt.updatedAt !== promptStore.currentPrompt.createdAt">
            | {{ t('date.updated') }} {{ new Date(promptStore.currentPrompt.updatedAt).toLocaleDateString() }}
          </span>
        </p>
      </div>

      <!-- Editor Modal -->
      <CreatePromptModal v-if="editorOpen" :prompt="promptStore.currentPrompt" @close="editorOpen = false"
        @saved="() => { editorOpen = false; promptStore.fetchPrompts(); }" />

      <!-- Use Prompt Modal -->
      <UsePromptModal v-if="usePromptOpen" :prompt="promptStore.currentPrompt" @close="usePromptOpen = false" />

      <!-- Delete Confirmation Modal -->
      <DeleteConfirmationModal v-if="deleteDialogOpen" entity-type="'prompt'" :entity-id="pendingDeleteId"
        @close="deleteDialogOpen = false; pendingDeleteId = null"
        @confirm="(id) => { promptStore.deletePrompt(id).then(() => router.push('/')).catch(err => uiStore.setError(err.message)) }" />
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500 dark:text-gray-400">{{ t('promptDetail.notFound') }}</p>
      <router-link to="/" class="text-indigo-600 dark:text-indigo-400 hover:underline">{{ t('promptDetail.backLink') }}</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePromptStore } from '../stores/usePromptStore'
import { useUIStore } from '../stores/useUIStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'
import CreatePromptModal from '../components/CreatePromptModal.vue'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.vue'
import UsePromptModal from '../components/UsePromptModal.vue'

const route = useRoute()
const router = useRouter()
const promptStore = usePromptStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

const editorOpen = ref(false)
const usePromptOpen = ref(false)

function isOwnPrompt() {
  if (!authStore.isAuthenticated || !promptStore.currentPrompt) return false
  return authStore.isOwner(promptStore.currentPrompt.ownerId)
}
const deleteDialogOpen = ref(false)
const pendingDeleteId = ref(null)

onMounted(async () => {
  try {
    await promptStore.fetchPrompt(route.params.id)
  } catch (error) {
    uiStore.setError(error.message)
  }
})

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    uiStore.setSuccess(t('common.successCopied'))
  })
}

function openDeleteDialog() {
  pendingDeleteId.value = route.params.id
  deleteDialogOpen.value = true
}

function handleDeleteConfirm(id) {
  promptStore.deletePrompt(id).then(() => {
    router.push('/')
  }).catch(err => {
    uiStore.setError(err.message)
  })
}
</script>
