import { createRouter, createWebHistory } from 'vue-router'
import { canNavigate } from './guards.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue')
  },
  {
    path: '/',
    name: 'PromptList',
    component: () => import('../views/PromptListView.vue')
  },
  {
    path: '/prompt/:id',
    name: 'PromptDetail',
    component: () => import('../views/PromptDetailView.vue')
  },
  {
    path: '/category/:id',
    name: 'CategoryView',
    component: () => import('../views/CategoryView.vue')
  },
  {
    path: '/settings',
    name: 'SettingsView',
    component: () => import('../views/SettingsView.vue')
  },
  {
    path: '/profile/:id',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue')
  },
  {
    path: '/admin/users',
    name: 'ManageUsers',
    component: () => import('../views/ManageUsersView.vue'),
    meta: { requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard: public routes for everyone, protected routes require a full
// session, /profile/:id of another user requires admin (see guards.js).
router.beforeEach(canNavigate)

export default router
