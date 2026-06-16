<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            {{ t('nav.title') }}
          </router-link>
          <div class="hidden sm:flex space-x-4">
            <router-link to="/" class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              {{ t('nav.promptsLink') }}
            </router-link>
            <router-link to="/settings" class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              {{ t('nav.settingsLink') }}
            </router-link>
          </div>
        </div>

        <!-- Language selector -->
        <div class="flex items-center space-x-1 text-sm">
          <button @click="i18nStore.setLanguage('es')"
            :class="[i18nStore.language === 'es' ? 'text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700']">
            es
          </button>
          <span class="text-gray-300">|</span>
          <button @click="i18nStore.setLanguage('en')"
            :class="[i18nStore.language === 'en' ? 'text-indigo-600 font-semibold' : 'text-gray-500 hover:text-gray-700']">
            en
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { useI18nStore } from '../stores/useI18nStore'

const i18nStore = useI18nStore()
const t = i18nStore.t
</script>
