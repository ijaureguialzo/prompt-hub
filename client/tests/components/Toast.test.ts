import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Toast from '@/components/Toast.vue'

// Mutable mock — tests update its properties directly.
const mockUIStoreState = { toasts: [] as Array<{ id: number; type: string; message: string }> }
vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

function makeToast(id: number, type: string, message: string) {
  return { id, type, message }
}

describe('Toast', () => {
  it('renders nothing when the queue is empty but keeps the live region mounted', () => {
    mockUIStoreState.toasts = []
    const wrapper = mount(Toast)
    expect(wrapper.text()).toBe('')
    // The container must stay in the DOM so screen readers announce
    // toasts as they appear (a v-if'd live region is not announced).
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-live')).toBe('polite')
  })

  it('renders each queued toast with its type styling', () => {
    mockUIStoreState.toasts = [
      makeToast(1, 'error', 'Something went wrong'),
      makeToast(2, 'success', 'Operation successful')
    ]
    const wrapper = mount(Toast)
    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.text()).toContain('Operation successful')
    const items = wrapper.element.querySelectorAll('div > div')
    expect(items).toHaveLength(2)
    expect(items[0].className).toContain('bg-red-600')
    expect(items[1].className).toContain('bg-green-600')
  })

  it('supports multiple toasts of the same type', () => {
    mockUIStoreState.toasts = [
      makeToast(1, 'error', 'First error'),
      makeToast(2, 'error', 'Second error')
    ]
    const wrapper = mount(Toast)
    expect(wrapper.text()).toContain('First error')
    expect(wrapper.text()).toContain('Second error')
  })

  it('renders a fixed-positioned container', () => {
    mockUIStoreState.toasts = [makeToast(1, 'error', 'Test error')]
    const wrapper = mount(Toast)
    expect(wrapper.classes()).toContain('fixed')
  })
})
