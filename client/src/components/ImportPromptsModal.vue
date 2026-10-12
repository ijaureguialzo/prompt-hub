<template>
  <!-- Sectioned layout manages its own padding (:padded="false"). -->
  <Modal :label="t('importModal.title')" panel-class="max-w-2xl max-h-[90vh] flex flex-col" :padded="false" @close="$emit('close')">
    <!-- Header -->
    <div class="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-1">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ t('importModal.title') }}</h2>
        <button @click="$emit('close')" class="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p v-if="fileName" class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('importModal.fileNote', { file: fileName }) }}
      </p>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {{
          t('importModal.summary', {
            new: counts.new,
            exists: counts.exists,
            skip: counts.duplicate + counts.invalid
          })
        }}
      </p>

      <!-- Warnings -->
      <div
        v-if="quota?.exceeded"
        class="mt-3 px-3 py-2 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-sm"
      >
        {{ t('importModal.quotaWarning', { used: quota.used, limit: quota.limit }) }}
      </div>
      <div
        v-if="counts.invalid > 0"
        class="mt-3 px-3 py-2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm"
      >
        {{ t('importModal.invalidNote', { count: counts.invalid }) }}
      </div>
      <div
        v-if="categoriesToCreate.length > 0"
        class="mt-3 px-3 py-2 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm"
      >
        {{ t('importModal.categoriesToCreate', { names: categoriesToCreate.join(', ') }) }}
      </div>
    </div>

    <!-- Selection controls -->
    <div class="px-6 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
      <div class="flex space-x-4">
        <button @click="selectAll" class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
          {{ t('importModal.selectAll') }}
        </button>
        <button
          @click="deselectAll"
          class="text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline"
        >
          {{ t('importModal.deselectAll') }}
        </button>
      </div>
      <span v-if="!anySelectable" class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('importModal.noneImportable') }}
      </span>
    </div>

    <!-- Rows -->
    <div class="flex-1 overflow-y-auto p-6 pt-3 space-y-2">
      <label
        v-for="entry in entries"
        :key="entry.index"
        class="flex items-start gap-3 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700"
        :class="{
          'opacity-50': !isSelectableStatus(entry.status)
        }"
      >
        <input
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
          :disabled="!isSelectableStatus(entry.status)"
          :checked="isSelected(entry)"
          @change="toggle(entry, $event.target.checked)"
        />
        <span class="flex-1 min-w-0">
          <span class="flex items-center gap-2">
            <span class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ entry.title }}</span>
            <span
              class="px-2 py-0.5 rounded-full text-xs font-semibold"
              :class="badgeClass(entry.status)"
            >
              {{ badgeLabel(entry.status) }}
            </span>
          </span>
          <span
            v-if="entry.status === 'exists' && entry.existingTitle"
            class="block text-xs text-gray-500 dark:text-gray-400 mt-1"
          >
            {{ t('importModal.overwriteHint') }}
          </span>
          <span
            v-else-if="entry.status === 'invalid'"
            class="block text-xs text-red-500 dark:text-red-400 mt-1"
          >
            {{ invalidReasonLabel(entry.invalidReason) }}
          </span>
          <span
            v-if="entry.categoryWillBeCreated === true"
            class="block text-xs text-indigo-600 dark:text-indigo-400 mt-1"
          >
            {{ t('importModal.categoryWillBeCreated', { name: entry.categoryName }) }}
          </span>
          <span
            v-else-if="entry.categoryResolved === false && entry.categoryName"
            class="block text-xs text-amber-600 dark:text-amber-400 mt-1"
          >
            {{ t('importModal.categoryUnresolved', { name: entry.categoryName }) }}
          </span>
        </span>
      </label>
    </div>

    <!-- Footer -->
    <div class="p-6 pt-4 flex justify-end space-x-3">
      <button @click="$emit('close')"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
        {{ t('importModal.cancel') }}
      </button>
      <button
        @click="handleConfirm"
        :disabled="importing || !anythingSelected || quota?.exceeded"
        class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ importing ? t('importModal.importing') : t('importModal.import') }}
      </button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18nStore } from '../stores/useI18nStore.js'
import Modal from './Modal.vue'

const props = defineProps({
  // Rows from the file (see usePromptStore.importEntries): each has
  // { index, title, status: 'new'|'exists'|'duplicate'|'invalid', ... }
  entries: { type: Array, required: true },
  quota: { type: Object, default: null },
  // Names the apply phase will create (server dry-run `categories.toCreate`)
  categories: { type: Array, default: null },
  importing: { type: Boolean, default: false },
  fileName: { type: String, default: '' }
})

const emit = defineEmits(['close', 'confirm'])

const i18nStore = useI18nStore()
const t = i18nStore.t

// Local selection, parallel to `entries` (invalid/duplicate rows stay off).
const selected = ref([])

function isSelectableStatus(status) {
  return status === 'new' || status === 'exists'
}

watch(
  () => props.entries,
  (entries) => {
    selected.value = entries.map((e) => e.status === 'new')
  },
  { immediate: true, deep: true }
)

const counts = computed(() => ({
  new: props.entries.filter((e) => e.status === 'new').length,
  exists: props.entries.filter((e) => e.status === 'exists').length,
  duplicate: props.entries.filter((e) => e.status === 'duplicate').length,
  invalid: props.entries.filter((e) => e.status === 'invalid').length
}))

const anySelectable = computed(() => props.entries.some((e) => isSelectableStatus(e.status)))
const categoriesToCreate = computed(() =>
  Array.isArray(props.categories) ? props.categories : []
)
const anythingSelected = computed(() =>
  props.entries.some((e, i) => isSelectableStatus(e.status) && selected.value[i])
)

function isSelected(entry) {
  return Boolean(selected.value[entry.index])
}

function toggle(entry, value) {
  selected.value = selected.value.map((s, i) => (i === entry.index ? value : s))
}

function selectAll() {
  selected.value = props.entries.map((e) => isSelectableStatus(e.status))
}

function deselectAll() {
  selected.value = props.entries.map(() => false)
}

function badgeLabel(status) {
  if (status === 'new') return t('importModal.newBadge')
  if (status === 'exists') return t('importModal.existsBadge')
  if (status === 'duplicate') return t('importModal.duplicateBadge')
  return t('importModal.invalidBadge')
}

function badgeClass(status) {
  if (status === 'new') {
    return 'bg-green-100/80 text-green-700 dark:bg-green-900/60 dark:text-green-300'
  }
  if (status === 'exists') {
    return 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
  }
  if (status === 'duplicate') {
    return 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  }
  return 'bg-red-100/80 text-red-700 dark:bg-red-900/60 dark:text-red-300'
}

function invalidReasonLabel(reason) {
  if (reason === 'title') return t('importModal.invalidTitleReason')
  if (reason === 'content') return t('importModal.invalidContentReason')
  return t('importModal.invalidTagsReason')
}

function handleConfirm() {
  // The store remaps these positions to the valid-only array it sends.
  const overwrites = props.entries
    .filter((e, i) => e.status === 'exists' && selected.value[i])
    .map((e) => e.index)
  emit('confirm', overwrites)
}
</script>
