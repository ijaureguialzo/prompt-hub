import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Toast from '@/components/Toast.vue'

// Mutable mock — tests update its properties directly.
const mockUIStoreState = { error: null, successMessage: null }
vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState),
}))

describe('Toast', () => {
  it('does not render anything when there is no error or success message', () => {
    mockUIStoreState.error = null
    mockUIStoreState.successMessage = null
    const wrapper = mount(Toast)
    expect(wrapper.text()).toBe('')
  })

  it('renders the error message when uiStore.error is set', () => {
    mockUIStoreState.error = 'Something went wrong'
    mockUIStoreState.successMessage = null
    const wrapper = mount(Toast)
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('renders the success message when uiStore.successMessage is set', () => {
    mockUIStoreState.error = null
    mockUIStoreState.successMessage = 'Operation successful'
    const wrapper = mount(Toast)
    expect(wrapper.text()).toContain('Operation successful')
  })

  it('renders both error and success messages when both are set', () => {
    mockUIStoreState.error = 'Error!'
    mockUIStoreState.successMessage = 'Success!'
    const wrapper = mount(Toast)
    expect(wrapper.text()).toContain('Error!')
    expect(wrapper.text()).toContain('Success!')
  })

  it('renders a fixed-positioned container when there is a message', () => {
    mockUIStoreState.error = 'Test error'
    mockUIStoreState.successMessage = null
    const wrapper = mount(Toast)
    expect(wrapper.classes()).toContain('fixed')
  })
})
