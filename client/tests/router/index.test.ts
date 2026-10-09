import { describe, it, expect, beforeEach } from 'vitest'
import { canNavigate, isAuthenticated, isAdmin } from '@/router/guards.js'

// Test the REAL guard logic (extracted in src/router/guards.js), using the
// mocked localStorage from tests/setup.ts.

function setSession(token: string | null, user: Record<string, unknown> | null) {
  if (token === null) window.localStorage.removeItem('token')
  else window.localStorage.setItem('token', token)
  if (user === null) window.localStorage.removeItem('user')
  else window.localStorage.setItem('user', JSON.stringify(user))
}

describe('Router Guards (canNavigate)', () => {
  beforeEach(() => {
    setSession(null, null)
  })

  it('allows public route (Login) when not authenticated', () => {
    expect(canNavigate({ name: 'Login', params: {}, fullPath: '/login' })).toBe(true)
  })

  it('redirects public route (Register) when authenticated', () => {
    setSession('tok', { email: 'a@b.com' })
    expect(canNavigate({ name: 'Register', params: {}, fullPath: '/register' })).toEqual({ name: 'PromptList' })
  })

  it('redirects to Login when accessing protected route without token', () => {
    expect(canNavigate({ name: 'PromptList', params: {}, fullPath: '/' })).toEqual({
      name: 'Login',
      query: { redirect: '/' },
    })
  })

  it('allows protected route when authenticated', () => {
    setSession('tok', { email: 'a@b.com' })
    expect(canNavigate({ name: 'PromptList', params: {}, fullPath: '/' })).toBe(true)
  })

  it('allows PromptDetail when authenticated', () => {
    setSession('tok', { email: 'a@b.com' })
    expect(canNavigate({ name: 'PromptDetail', params: { id: 'x' }, fullPath: '/prompt/x' })).toBe(true)
  })

  it('allows SettingsView when authenticated', () => {
    setSession('tok', { email: 'a@b.com' })
    expect(canNavigate({ name: 'SettingsView', params: {}, fullPath: '/settings' })).toBe(true)
  })

  it('redirects to PromptList when accessing admin route without admin role', () => {
    setSession('tok', { email: 'a@b.com', role: 'user' })
    expect(canNavigate({ name: 'ManageUsers', params: {}, fullPath: '/admin/users', meta: { requiresAdmin: true } })).toEqual({ name: 'PromptList' })
  })

  it('allows admin route when user is admin', () => {
    setSession('tok', { email: 'admin@test.com', role: 'admin' })
    expect(canNavigate({ name: 'ManageUsers', params: {}, fullPath: '/admin/users', meta: { requiresAdmin: true } })).toBe(true)
  })

  it('redirects to Login when no token for admin route', () => {
    expect(canNavigate({ name: 'ManageUsers', params: {}, fullPath: '/admin/users', meta: { requiresAdmin: true } })).toEqual({
      name: 'Login',
      query: { redirect: '/admin/users' },
    })
  })

  // --- Profile ownership guard (task 15) ---

  it('allows OWN profile for any authenticated user', () => {
    setSession('tok', { _id: 'u1', email: 'a@b.com', role: 'user' })
    expect(canNavigate({ name: 'Profile', params: { id: 'u1' }, fullPath: '/profile/u1' })).toBe(true)
  })

  it('blocks OTHER users profiles for non-admins', () => {
    setSession('tok', { _id: 'u1', email: 'a@b.com', role: 'user' })
    expect(canNavigate({ name: 'Profile', params: { id: 'u2' }, fullPath: '/profile/u2' })).toEqual({ name: 'PromptList' })
  })

  it('allows other users profiles for admins', () => {
    setSession('tok', { _id: 'u1', email: 'a@b.com', role: 'admin' })
    expect(canNavigate({ name: 'Profile', params: { id: 'u2' }, fullPath: '/profile/u2' })).toBe(true)
  })

  it('redirects unauthenticated visitors of a profile to Login', () => {
    expect(canNavigate({ name: 'Profile', params: { id: 'u2' }, fullPath: '/profile/u2' })).toEqual({
      name: 'Login',
      query: { redirect: '/profile/u2' },
    })
  })

  // --- helpers ---

  it('isAuthenticated requires token and user with email', () => {
    setSession(null, { email: 'a@b.com' })
    expect(isAuthenticated()).toBe(false)
    setSession('tok', null)
    expect(isAuthenticated()).toBe(false)
    setSession('tok', { email: 'a@b.com' })
    expect(isAuthenticated()).toBe(true)
  })

  it('isAdmin checks the stored role', () => {
    setSession('tok', { role: 'user' })
    expect(isAdmin()).toBe(false)
    setSession('tok', { role: 'admin' })
    expect(isAdmin()).toBe(true)
    setSession('tok', null)
    expect(isAdmin()).toBe(false)
  })
})
