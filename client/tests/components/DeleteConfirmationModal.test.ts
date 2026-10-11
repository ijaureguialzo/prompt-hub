import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal.vue'

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
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
    const wrapper = mount(DeleteConfirmationModal, {
      props: { ...baseProps, entityType: 'category' }
    })
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

  describe('accessibility (PLAN.md P2/10)', () => {
    let trigger: HTMLButtonElement

    beforeEach(() => {
      trigger = document.createElement('button')
      document.body.appendChild(trigger)
      trigger.focus()
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it('exposes role=dialog, aria-modal and the title as the accessible name', () => {
      const wrapper = mount(DeleteConfirmationModal, { props: baseProps, attachTo: document.body })
      try {
        const panel = wrapper.find('[role="dialog"]')
        expect(panel.attributes('aria-modal')).toBe('true')
        expect(panel.attributes('aria-label')).toBe('common.confirmDeleteTitle')
      } finally {
        wrapper.unmount()
      }
    })

    it('closes on Escape', async () => {
      const wrapper = mount(DeleteConfirmationModal, { props: baseProps, attachTo: document.body })
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
      } finally {
        wrapper.unmount()
      }
    })

    it('moves focus into the dialog and restores the trigger on close', async () => {
      const wrapper = mount(DeleteConfirmationModal, { props: baseProps, attachTo: document.body })
      await nextTick()
      const panel = wrapper.find('[role="dialog"]').element
      expect(panel.contains(document.activeElement)).toBe(true)
      wrapper.unmount()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
