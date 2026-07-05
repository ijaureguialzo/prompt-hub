<template>
  <router-link
    :to="`/prompt/${prompt._id}`"
    class="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <p class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{{ prompt.title }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{{ prompt.content }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span v-if="prompt.categoryId" @click.stop="$emit('filterByCategory', prompt.categoryId.name)"
            class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer border"
            :class="categoryBadgeClass(prompt.categoryId.name)">
            {{ prompt.categoryId.name }}
          </span>
          <span v-else @click.stop="$emit('filterByCategory', t('createPromptModal.uncategorized'))"
            class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer border border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
            {{ t('createPromptModal.uncategorized') }}
          </span>
          <template v-if="prompt.tags && prompt.tags.length">
            <span v-for="tag in prompt.tags" :key="tag"
              @click.stop="$emit('filterByTag', tag)"
              class="text-xs px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600">
              {{ tag }}
            </span>
          </template>
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

const paletteLight = [
  'bg-emerald-100/80 text-emerald-700 border-emerald-300 hover:bg-emerald-200/80',
  'bg-sky-100/80 text-sky-700 border-sky-300 hover:bg-sky-200/80',
  'bg-violet-100/80 text-violet-700 border-violet-300 hover:bg-violet-200/80',
  'bg-amber-100/80 text-amber-700 border-amber-300 hover:bg-amber-200/80',
  'bg-rose-100/80 text-rose-700 border-rose-300 hover:bg-rose-200/80',
  'bg-cyan-100/80 text-cyan-700 border-cyan-300 hover:bg-cyan-200/80',
]

const paletteDark = [
  'bg-emerald-900/60 text-emerald-300 border-emerald-700 hover:bg-emerald-800/60',
  'bg-sky-900/60 text-sky-300 border-sky-700 hover:bg-sky-800/60',
  'bg-violet-900/60 text-violet-300 border-violet-700 hover:bg-violet-800/60',
  'bg-amber-900/60 text-amber-300 border-amber-700 hover:bg-amber-800/60',
  'bg-rose-900/60 text-rose-300 border-rose-700 hover:bg-rose-800/60',
  'bg-cyan-900/60 text-cyan-300 border-cyan-700 hover:bg-cyan-800/60',
]

function categoryBadgeClass(name) {
  if (!name) return 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % paletteLight.length
  return `${paletteLight[idx]} dark:${paletteDark[idx]}`
}
</script>
