const API_URL = import.meta.env.VITE_API_URL || '/api'

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

export const promptsApi = {
  getAll: () => request('/prompts'),
  getById: (id) => request(`/prompts/${id}`),
  create: (data) => request('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/prompts/${id}`, { method: 'DELETE' }),
}

export const categoriesApi = {
  getAll: () => request('/categories'),
  getById: (id) => request(`/categories/${id}`),
  create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
}
