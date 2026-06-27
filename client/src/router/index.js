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
    path: '/profile/:id',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
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

function isAuthenticated() {
  const token = localStorage.getItem('token')
  if (!token) return false
  // A valid session requires both token and user data
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    return !!user && !!user.email
  } catch {
    return false
  }
}

function isAdmin() {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    return user?.role === 'admin'
  } catch {
    return false
  }
}

// Auth guard: redirect unauthenticated users to login
router.beforeEach((to) => {
  // Public routes (login, register) — no guard needed
  if (to.name === 'Login' || to.name === 'Register') {
    // If already logged in, redirect to home
    if (isAuthenticated()) {
      return { name: 'PromptList' }
    }
    return
  }

  // Protected routes: require full authentication (token + valid user)
  if (!isAuthenticated()) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Admin routes: require admin role
  if (to.meta.requiresAdmin && !isAdmin()) {
    return { name: 'PromptList' }
  }

  return true
})

export default router
