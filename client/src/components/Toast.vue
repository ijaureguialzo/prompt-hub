<template>
  <div role="status" aria-live="polite" class="fixed top-4 right-4 z-50 space-y-2">
    <!--
      The live region stays mounted (even empty) so assistive tech
      announces toasts as they appear: a v-if'd container would not be
      announced.
    -->
    <div
      v-for="toast in uiStore.toasts"
      :key="toast.id"
      class="px-4 py-2 rounded-lg shadow-md text-sm max-w-xs text-white"
      :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { useUIStore } from '../stores/useUIStore'

const uiStore = useUIStore()
</script>
