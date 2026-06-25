const API_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

function clearAuth() {
  try { localStorage.removeItem('token') } catch {}
  try { localStorage.removeItem('user') } catch {}
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    headers,
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    // Clear stale token on 401 (auth error from backend)
    if (response.status === 401) {
      clearAuth()
      // Redirect to login if not already there
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
      }
    }
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export function apiRequestWithToken(endpoint, options = {}) {
  // Same as apiRequest but explicitly includes token from localStorage
  return apiRequest(endpoint, options)
}

export const promptsApi = {
  getAll: () => apiRequest('/prompts'),
  getById: (id) => apiRequest(`/prompts/${id}`),
  create: (data) => apiRequest('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/prompts/${id}`, { method: 'DELETE' }),
}

export const categoriesApi = {
  getAll: () => apiRequest('/categories'),
  getById: (id) => apiRequest(`/categories/${id}`),
  create: (data) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
}

export const authApi = {
  register: (email, password) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getCurrentUser: () => apiRequest('/auth/me'),
}

export const usersApi = {
  getAll: () => apiRequest('/users'),
  getById: (id) => apiRequest(`/users/${id}`),
  update: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
}

export const siteConfigApi = {
  getPublicConfig: () => apiRequest('/site-config/public'),
  getConfig: () => apiRequest('/site-config'),
  updateConfig: (data) => apiRequest('/site-config', { method: 'PUT', body: JSON.stringify(data) }),
}
