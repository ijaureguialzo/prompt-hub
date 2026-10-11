<template>
  <!--
    The `dark` class lives on <html> (useThemeStore._applyDomClass) so the
    <body> background is themed too — no light overscroll in dark mode.
  -->
  <div class="min-h-screen bg-white dark:bg-gray-950">
    <Navbar />
    <Toast />
    <main class="container mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import Navbar from './components/Navbar.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/useAuthStore'
import { useThemeStore } from './stores/useThemeStore'

const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(() => {
  authStore.init()
})

onUnmounted(() => {
  themeStore.dispose()
})
</script>
