import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal.vue'

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key })),
}))

describe('DeleteConfirmationModal', () => {
  const baseProps = { entityType: 'prompt', entityId: 'prompt-123' }

  it('renders the confirmation title and message', () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    expect(wrapper.text()).toContain('common.confirmDeleteTitle')
  })

  it('shows the correct message for entityType=prompt', () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    expect(wrapper.text()).toContain('common.confirmDeletePrompt')
  })

  it('shows the correct message for entityType=category', () => {
    const wrapper = mount(DeleteConfirmationModal, { props: { ...baseProps, entityType: 'category' } })
    expect(wrapper.text()).toContain('common.confirmDeleteCategory')
  })

  it('cancel button emits close', async () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('confirm button emits confirm with entityId and close', async () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')?.[0]).toEqual(['prompt-123'])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renders a modal overlay (fixed positioning)', () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    expect(wrapper.classes()).toContain('fixed')
  })

  it('renders a cancel button and a confirm (delete) button', () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    expect(wrapper.findAll('button')).toHaveLength(2)
  })

  it('does not emit confirm when cancel is clicked', async () => {
    const wrapper = mount(DeleteConfirmationModal, { props: baseProps })
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('confirm')).toBeFalsy()
  })
})
