import { getActivePinia } from 'pinia'
import { useI18nStore, translateFrom } from '../stores/useI18nStore.js'
import en from '../locales/en.js'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Stable server error codes -> locale keys (see the `errors` section of the
// locale files and the server's error responses). The server keeps the
// English `message` as a fallback for clients that do not translate.
const ERROR_CODE_KEYS = {
  AUTH_REQUIRED: 'errors.authRequired',
  INVALID_TOKEN: 'errors.invalidToken',
  USER_INACTIVE: 'errors.userInactive',
  FORBIDDEN: 'errors.forbidden',
  NOT_OWNER: 'errors.notOwner',
  INVALID_CREDENTIALS: 'errors.invalidCredentials',
  ACCOUNT_DEACTIVATED: 'errors.accountDeactivated',
  REGISTRATION_DISABLED: 'errors.registrationDisabled',
  EMAIL_TAKEN: 'errors.emailTaken',
  WRONG_PASSWORD: 'errors.wrongPassword',
  PASSWORD_TOO_SHORT: 'errors.passwordTooShort',
  VALIDATION_ERROR: 'errors.validationError',
  TAGS_TOO_MANY: 'errors.tagsTooMany',
  EMAIL_INVALID: 'errors.emailInvalid',
  DUPLICATE: 'errors.duplicate',
  NOT_FOUND: 'errors.notFound',
  LIMIT_REACHED: 'errors.limitReached',
  RATE_LIMITED: 'errors.rateLimited',
  SELF_MODIFICATION: 'errors.selfModification',
  INTERNAL_ERROR: 'errors.internalError'
}

// Resolves a message against the user's current locale. Outside an active
// pinia (unit tests without one, non-Vue consumers) the English locale is
// the fallback, so errors always have a sane English string.
function tMessage(key, params = {}) {
  const locale = getActivePinia() ? useI18nStore().currentLocale : en
  return translateFrom(locale, key, params)
}

// Translates a server error body for the UI. Unknown/missing codes fall
// back to the server's English message, then to a generic localized string.
function toErrorMessage(data) {
  const key = ERROR_CODE_KEYS[data?.code]
  if (key) return tMessage(key, data)
  if (data?.message) return data.message
  return tMessage('errors.requestFailed')
}

function getToken() {
  return localStorage.getItem('token')
}

function clearAuth() {
  // localStorage access can throw in hardened browsers — auth is a
  // convenience, never a crash
  try {
    localStorage.removeItem('token')
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem('user')
  } catch {
    /* ignore */
  }
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
      ...options
    })
  } catch {
    throw new Error(tMessage('errors.networkError'))
  }

  // Safe body parsing: a reverse proxy may return non-JSON error pages.
  const text = await response.text()
  let data
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
    throw new Error(toErrorMessage(data))
  }

  return data
}

export const promptsApi = {
  getAll: (params = {}) => apiRequest(buildUrl('/prompts', params)),
  getById: (id) => apiRequest(`/prompts/${id}`),
  create: (data) => apiRequest('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/prompts/${id}`, { method: 'DELETE' })
}

/**
 * Append query params, skipping empty values. Array params repeat the key
 * (e.g. { tag: ['a', 'b'] } -> ?tag=a&tag=b) for the server's AND filter.
 */
function buildUrl(endpoint, params) {
  const parts = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') continue
        parts.push(`${key}=${encodeURIComponent(item)}`)
      }
    } else {
      parts.push(`${key}=${encodeURIComponent(value)}`)
    }
  }
  return parts.length ? `${endpoint}?${parts.join('&')}` : endpoint
}

export const categoriesApi = {
  getAll: () => apiRequest('/categories'),
  getById: (id) => apiRequest(`/categories/${id}`),
  create: (data) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' })
}

export const authApi = {
  register: (name, email, password) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  updateMe: (data) => apiRequest('/auth/me', { method: 'PATCH', body: JSON.stringify(data) })
}

export const usersApi = {
  getAll: () => apiRequest('/users'),
  getById: (id) => apiRequest(`/users/${id}`),
  update: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' })
}

export const siteConfigApi = {
  getPublicConfig: () => apiRequest('/site-config/public'),
  getConfig: () => apiRequest('/site-config'),
  updateConfig: (data) => apiRequest('/site-config', { method: 'PUT', body: JSON.stringify(data) })
}
