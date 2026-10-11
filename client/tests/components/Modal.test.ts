import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Modal from '@/components/Modal.vue'

// The element that "opened" the dialog — the focus-restore target.
function createTrigger() {
  const trigger = document.createElement('button')
  trigger.textContent = 'trigger'
  document.body.appendChild(trigger)
  trigger.focus()
  return trigger
}

function dispatchKeydown(key: string, shiftKey = false) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }))
}

// A panel with two focusable buttons (first/last) for trap assertions.
const slotButtons = {
  default: '<button id="first">first</button><button id="last">last</button>'
}

describe('Modal (accessible dialog base, PLAN.md P2/10)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the slot inside a role=dialog panel with aria-modal and the label', () => {
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: { label: 'My dialog' },
      slots: slotButtons
    })
    const panel = wrapper.find('[role="dialog"]')
    expect(panel.exists()).toBe(true)
    expect(panel.attributes('aria-modal')).toBe('true')
    expect(panel.attributes('aria-label')).toBe('My dialog')
    expect(wrapper.text()).toContain('first')
    expect(wrapper.text()).toContain('last')
    wrapper.unmount()
  })

  it('moves focus to the first focusable element on mount', async () => {
    const wrapper = mount(Modal, { attachTo: document.body, slots: slotButtons })
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('#first').element)
    wrapper.unmount()
  })

  it('wraps Tab from the last focusable element back to the first', async () => {
    const wrapper = mount(Modal, { attachTo: document.body, slots: slotButtons })
    await nextTick()
    wrapper.find('#last').element.focus()
    dispatchKeydown('Tab')
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('#first').element)
    wrapper.unmount()
  })

  it('wraps Shift+Tab from the first focusable element back to the last', async () => {
    const wrapper = mount(Modal, { attachTo: document.body, slots: slotButtons })
    await nextTick()
    wrapper.find('#first').element.focus()
    dispatchKeydown('Tab', true)
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('#last').element)
    wrapper.unmount()
  })

  it('pulls focus back inside when it has drifted to the body', async () => {
    const wrapper = mount(Modal, { attachTo: document.body, slots: slotButtons })
    await nextTick()
    document.body.focus()
    dispatchKeydown('Tab')
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('#first').element)
    wrapper.unmount()
  })

  it('emits close on Escape', async () => {
    const wrapper = mount(Modal, { attachTo: document.body, slots: slotButtons })
    await nextTick()
    dispatchKeydown('Escape')
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('returns focus to the opening element on unmount', async () => {
    const trigger = createTrigger()
    const wrapper = mount(Modal, { attachTo: document.body, slots: slotButtons })
    await nextTick()
    expect(document.activeElement).not.toBe(trigger) // focus moved into the dialog
    wrapper.unmount()
    await nextTick()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('focuses the panel itself when the content has no focusable elements', async () => {
    const wrapper = mount(Modal, {
      attachTo: document.body,
      slots: { default: '<p>nothing focusable</p>' }
    })
    await nextTick()
    const panel = wrapper.find('[role="dialog"]').element
    expect(document.activeElement).toBe(panel)
    wrapper.unmount()
  })

  it('applies the panel class and skips the p-6 wrapper when padded=false', () => {
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: { panelClass: 'max-w-2xl flex flex-col', padded: false },
      slots: { default: '<div class="section">body</div>' }
    })
    const panel = wrapper.find('[role="dialog"]')
    expect(panel.classes()).toContain('max-w-2xl')
    expect(panel.classes()).toContain('flex')
    expect(panel.find('.p-6').exists()).toBe(false)
    wrapper.unmount()
  })
})
