import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'PromptList',
    component: () => import('../views/PromptListView.vue'),
  },
  {
    path: '/prompt/:id',
    name: 'PromptDetail',
    component: () => import('../views/PromptDetailView.vue'),
  },
  {
    path: '/category/:id',
    name: 'CategoryView',
    component: () => import('../views/CategoryView.vue'),
  },
  {
    path: '/settings',
    name: 'SettingsView',
    component: () => import('../views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
