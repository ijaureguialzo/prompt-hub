import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
  },
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
  {
    path: '/admin/users',
    name: 'ManageUsers',
    component: () => import('../views/ManageUsersView.vue'),
    meta: { requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard: redirect unauthenticated users to login
router.beforeEach((to, from) => {
  const token = localStorage.getItem('token')

  // Public routes (login, register) — no guard needed
  if (to.name === 'Login' || to.name === 'Register') {
    // If already logged in, redirect to home
    if (token) {
      return { name: 'PromptList' }
    }
    return
  }

  // Protected routes: require authentication
  if (!token) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Admin routes: require admin role
  if (to.meta.requiresAdmin) {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role !== 'admin') {
          return { name: 'PromptList' }
        }
      }
    } catch {}
  }

  return true
})

export default router
