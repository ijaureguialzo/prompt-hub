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
    </div>
  </router-link>
</template>

<script setup>
import { useI18nStore } from '../stores/useI18nStore.js'

const props = defineProps({
  prompt: { type: Object, required: true },
})

const emit = defineEmits(['filterByCategory', 'filterByTag'])

const i18nStore = useI18nStore()
const t = i18nStore.t
</script>
