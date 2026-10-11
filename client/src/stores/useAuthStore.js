import { defineStore } from 'pinia'
import { authApi } from '../api/index.js'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage may be unavailable */
  }
}

function saveUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* storage may be unavailable */
  }
}

function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage may be unavailable */
  }
}

function removeUser() {
  try {
    localStorage.removeItem(USER_KEY)
  } catch {
    /* storage may be unavailable */
  }
}

function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: loadToken(),
    user: loadUser(),
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isOwner: (state) => (resourceOwnerId) => {
      if (!state.user || !resourceOwnerId) return false
      return state.user._id === resourceOwnerId.toString()
    }
  },

  actions: {
    async login(email, password) {
      this.loading = true
      try {
        const data = await authApi.login(email, password)
        this.token = data.token
        this.user = data.user
        saveToken(data.token)
        saveUser(data.user)
        return data
      } catch (error) {
        throw new Error(error.message, { cause: error })
      } finally {
        this.loading = false
      }
    },

    async register(name, email, password) {
      this.loading = true
      try {
        const data = await authApi.register(name, email, password)
        this.token = data.token
        this.user = data.user
        saveToken(data.token)
        saveUser(data.user)
        return data
      } catch (error) {
        throw new Error(error.message, { cause: error })
      } finally {
        this.loading = false
      }
    },

    async fetchCurrentUser() {
      try {
        const data = await authApi.getCurrentUser()
        this.user = data.user
        saveUser(data.user)
      } catch {
        this.logout()
      }
    },

    async updateMe(data) {
      // Self-service profile update (name/email/password) via PATCH /auth/me
      const updated = await authApi.updateMe(data)
      this.user = updated.user
      saveUser(updated.user)
      return updated.user
    },

    async updateUser() {
      // No argument: the canonical data always comes fresh from the server
      // (e.g. after an admin changes this user's role/status).
      await this.fetchCurrentUser()
    },

    logout() {
      this.token = null
      this.user = null
      removeToken()
      removeUser()
    },

    init() {
      // Restore token and user from localStorage on app load
      this.token = loadToken()
      this.user = loadUser()
    }
  }
})
