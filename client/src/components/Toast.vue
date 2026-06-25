<template>
  <div v-if="uiStore.successMessage || uiStore.error" class="fixed top-4 right-4 z-50 space-y-2">
    <div
      v-if="uiStore.successMessage"
      class="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md text-sm max-w-xs"
    >
      {{ uiStore.successMessage }}
    </div>
    <div
      v-if="uiStore.error"
      class="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md text-sm max-w-xs"
    >
      {{ uiStore.error }}
    </div>
  </div>
</template>

<script setup>
import { useUIStore } from '../stores/useUIStore'

const uiStore = useUIStore()
</script>
