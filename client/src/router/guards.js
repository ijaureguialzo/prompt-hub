// Navigation guard logic, kept separate from the router instance so it can
// be unit-tested without instantiating the router/history.

function loadUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// A valid session requires both token and user data
export function isAuthenticated() {
  const token = localStorage.getItem('token')
  if (!token) return false
  const user = loadUser()
  return !!user && !!user.email
}

export function isAdmin() {
  return loadUser()?.role === 'admin'
}

// The full navigation decision for a target route. Returns `true` to
// allow, or a route location to redirect.
export function canNavigate(to) {
  // Public routes (login, register) — no guard needed
  if (to.name === 'Login' || to.name === 'Register') {
    if (isAuthenticated()) {
      return { name: 'PromptList' }
    }
    return true
  }

  // Protected routes: require full authentication (token + valid user)
  if (!isAuthenticated()) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Own profile: any authenticated user; someone else's profile: admin only
  if (to.name === 'Profile' && to.params.id) {
    const user = loadUser()
    if (String(to.params.id) !== String(user?._id) && !isAdmin()) {
      return { name: 'PromptList' }
    }
  }

  // Admin routes: require admin role
  if (to.meta?.requiresAdmin && !isAdmin()) {
    return { name: 'PromptList' }
  }

  return true
}
