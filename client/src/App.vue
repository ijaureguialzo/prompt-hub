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
  // Best-effort refresh (PLAN.md P2/19): if an admin changed the account's
  // role/status since the token was issued, the server is the source of
  // truth — pick it up so the guards and menus reflect reality. fetch
  // failures are handled inside the store (401 → soft logout).
  if (authStore.isAuthenticated) {
    authStore.fetchCurrentUser()
  }
})

onUnmounted(() => {
  themeStore.dispose()
})
</script>
