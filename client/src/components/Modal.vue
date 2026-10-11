<template>
  <div ref="overlay" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <!--
      tabindex="-1" makes the panel itself focusable so the trap has a
      landing spot even when the content has no focusable elements.
    -->
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="label || undefined"
      class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full"
      :class="panelClass"
    >
      <div v-if="padded" class="p-6">
        <slot />
      </div>
      <slot v-else />
    </div>
  </div>
</template>

<script setup>
/**
 * Accessible modal base (PLAN.md P2/10): overlay + panel with
 *  - `role="dialog"` + `aria-modal="true"` (+ optional `aria-label`),
 *  - a keyboard focus trap (Tab/Shift+Tab cycle inside the panel),
 *  - Escape closes (emits `close`; the parent unmounts the dialog),
 *  - focus restoration: the element that opened the dialog gets focus
 *    back when the modal unmounts.
 *
 * The trap is hand-rolled (~40 lines): the `useTrapFocus` utility that
 * existed in older @vueuse/core was removed in v14, and the rest of the
 * app only needs `onClickOutside`, so there is no new dependency.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // Extra panel classes (size/layout); the base surface styling lives in
  // the template above. e.g. 'max-w-2xl max-h-[90vh] overflow-y-auto'.
  panelClass: { type: String, default: 'max-w-md' },
  // Wrap the slot in a p-6 container. Sectioned layouts (import modal)
  // manage their own padding and opt out.
  padded: { type: Boolean, default: true },
  // Accessible name for the dialog — pass the modal's (translated) title.
  label: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const overlay = ref(null)
const panel = ref(null)

// The element that had focus when the dialog opened (the trigger button);
// focus is returned to it when the dialog unmounts.
let previouslyFocused = null

// Keyboard-focusable elements. (No visibility filtering: jsdom has no
// layout, and hidden focusable elements inside a modal are not a pattern
// this app uses.)
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function focusableElements() {
  return Array.from(panel.value ? panel.value.querySelectorAll(FOCUSABLE_SELECTOR) : [])
}

function focusFirst() {
  const elements = focusableElements()
  ;(elements[0] || panel.value)?.focus()
}

// Document-level (capture) so the trap also catches focus that has drifted
// to <body> when the dialog has no focusable content.
function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !panel.value) return

  const elements = focusableElements()
  if (!elements.length) {
    event.preventDefault()
    panel.value.focus()
    return
  }

  const first = elements[0]
  const last = elements[elements.length - 1]
  const active = document.activeElement
  const inside = panel.value.contains(active)

  if (event.shiftKey) {
    if (!inside || active === first) {
      event.preventDefault()
      last.focus()
    }
  } else if (!inside || active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement
  focusFirst()
  document.addEventListener('keydown', onKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  // Restore focus to the element that opened the dialog (if it is still in
  // the DOM — e.g. a trigger that was itself swapped out is skipped).
  if (previouslyFocused && previouslyFocused.isConnected) {
    previouslyFocused.focus()
  }
})
</script>
