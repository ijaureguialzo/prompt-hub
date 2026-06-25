<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <Toast />
    <main class="container mx-auto px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import Navbar from './components/Navbar.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/useAuthStore'

const authStore = useAuthStore()

onMounted(() => {
  authStore.init()
})
</script>
