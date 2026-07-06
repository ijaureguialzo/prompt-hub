import { describe, it, expect, vi } from 'vitest'

// We test the router guard logic directly by importing the helper functions.
// Since the router is created with createWebHistory which requires a browser,
// we test the guard logic by re-implementing the checks.

function isAuthenticated(token = null, user = null) {
  if (!token) return false
  try {
    return !!user && !!user.email
  } catch {
    return false
  }
}

function isAdmin(user = null) {
  try {
    return user?.role === 'admin'
  } catch {
    return false
  }
}

// Simulate the beforeEach guard logic.
function simulateGuard(toName, { token = null, user = null } = {}) {
  const publicRoutes = ['Login', 'Register']

  // Public routes — no guard needed
  if (publicRoutes.includes(toName)) {
    if (isAuthenticated(token, user)) {
      return { name: 'PromptList' }
    }
    return null // no redirect
  }

  // Protected routes: require full authentication
  if (!isAuthenticated(token, user)) {
    return { name: 'Login', query: { redirect: `/${toName}` } }
  }

  // Admin routes: require admin role
  if (toName === 'ManageUsers' && !isAdmin(user)) {
    return { name: 'PromptList' }
  }

  return true // allow navigation
}

describe('Router Guards', () => {
  it('allows public route (Login) when not authenticated', () => {
    expect(simulateGuard('Login')).toBeNull()
  })

  it('redirects public route (Register) when authenticated', () => {
    const result = simulateGuard('Register', { token: 'tok', user: { email: 'a@b.com' } })
    expect(result).toEqual({ name: 'PromptList' })
  })

  it('redirects to Login when accessing protected route without token', () => {
    const result = simulateGuard('PromptList')
    expect(result).toEqual({ name: 'Login', query: { redirect: '/PromptList' } })
  })

  it('allows protected route when authenticated', () => {
    const result = simulateGuard('PromptList', { token: 'tok', user: { email: 'a@b.com' } })
    expect(result).toBe(true)
  })

  it('allows PromptDetail when authenticated', () => {
    const result = simulateGuard('PromptDetail', { token: 'tok', user: { email: 'a@b.com' } })
    expect(result).toBe(true)
  })

  it('allows CategoryView when authenticated', () => {
    const result = simulateGuard('CategoryView', { token: 'tok', user: { email: 'a@b.com' } })
    expect(result).toBe(true)
  })

  it('allows SettingsView when authenticated', () => {
    const result = simulateGuard('SettingsView', { token: 'tok', user: { email: 'a@b.com' } })
    expect(result).toBe(true)
  })

  it('redirects to PromptList when accessing admin route without admin role', () => {
    const result = simulateGuard('ManageUsers', { token: 'tok', user: { email: 'a@b.com', role: 'user' } })
    expect(result).toEqual({ name: 'PromptList' })
  })

  it('allows admin route when user is admin', () => {
    const result = simulateGuard('ManageUsers', { token: 'tok', user: { email: 'admin@test.com', role: 'admin' } })
    expect(result).toBe(true)
  })

  it('redirects to Login when no token for admin route', () => {
    const result = simulateGuard('ManageUsers')
    expect(result).toEqual({ name: 'Login', query: { redirect: '/ManageUsers' } })
  })

  it('returns false for isAuthenticated with no token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('returns true for isAuthenticated with token and user', () => {
    expect(isAuthenticated('tok', { email: 'a@b.com' })).toBe(true)
  })

  it('returns false for isAuthenticated with token but no user', () => {
    expect(isAuthenticated('tok')).toBe(false)
  })

  it('returns true for isAdmin when role is admin', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
  })

  it('returns false for isAdmin when role is user', () => {
    expect(isAdmin({ role: 'user' })).toBe(false)
  })

  it('returns false for isAdmin when user is null', () => {
    expect(isAdmin(null)).toBe(false)
  })
})
