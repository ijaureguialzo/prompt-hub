<template>
  <router-link
    :to="`/prompt/${prompt._id}`"
    class="block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <p class="text-lg font-semibold text-gray-900 truncate">{{ prompt.title }}</p>
        <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ prompt.content }}</p>
        <div class="mt-2">
          <span v-if="prompt.categoryId" @click.stop="$emit('filterByCategory', prompt.categoryId.name)"
            class="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full cursor-pointer hover:bg-indigo-200">
            {{ prompt.categoryId.name }}
          </span>
          <span v-else @click.stop="$emit('filterByCategory', t('createPromptModal.uncategorized'))"
            class="inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full cursor-pointer hover:bg-gray-300">
            {{ t('createPromptModal.uncategorized') }}
          </span>
        </div>
        <div v-if="prompt.tags && prompt.tags.length" class="mt-2 flex flex-wrap gap-1">
          <span v-for="tag in prompt.tags" :key="tag"
            @click.stop="$emit('filterByTag', tag)"
            class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full cursor-pointer hover:bg-gray-200">
            {{ tag }}
          </span>
        </div>
      </div>
      <div class="flex items-center space-x-2 ml-4 flex-shrink-0">
        <router-link v-if="isOwnPrompt()"
          :to="`/prompt/${prompt._id}`"
          class="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          :title="t('promptCard.editTitle')"
          @click.stop
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-5.007a1 1 0 00-1.414-1.414l-4 4" />
          </svg>
        </router-link>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { useAuthStore } from '../stores/useAuthStore'
import { useI18nStore } from '../stores/useI18nStore.js'

const props = defineProps({
  prompt: { type: Object, required: true },
})

const emit = defineEmits(['filterByCategory', 'filterByTag'])

const authStore = useAuthStore()
const i18nStore = useI18nStore()
const t = i18nStore.t

function isOwnPrompt() {
  if (!authStore.isAuthenticated || !props.prompt.ownerId) return false
  return authStore.isOwner(props.prompt.ownerId)
}
</script>
