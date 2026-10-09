const API_URL = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  return localStorage.getItem('token')
}

function clearAuth() {
  try { localStorage.removeItem('token') } catch {}
  try { localStorage.removeItem('user') } catch {}
}

// Registered by main.js (avoids a circular import between the API client
// and the stores/router). Called with the current path on every 401; the
// handler decides when to redirect (e.g. skipping login/register pages).
let onUnauthorized = null

export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(url, {
      headers,
      ...options,
    })
  } catch {
    throw new Error('Network error. Is the API reachable?')
  }

  // Safe body parsing: a reverse proxy may return non-JSON error pages.
  const text = await response.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }

  if (!response.ok) {
    // Expired/invalid session: clear stale auth and delegate the redirect
    // (soft navigation via the router, no full page reload) to the handler.
    if (response.status === 401) {
      clearAuth()
      if (onUnauthorized) {
        onUnauthorized(window.location.pathname)
      }
    }
    throw new Error(data.message || 'Request failed')
  }

  return data
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
  register: (name, email, password) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  updateMe: (data) => apiRequest('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
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
