<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-8">
          <router-link to="/" class="text-xl font-bold text-indigo-600 hover:text-indigo-700">
            PromptHub
          </router-link>
          <div class="hidden sm:flex space-x-4">
            <router-link to="/" class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              Prompts
            </router-link>
            <router-link to="/settings" class="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
              Settings
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
