import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import UsePromptModal from '@/components/UsePromptModal.vue'

const mockUIStoreState = { setSuccess: vi.fn(), setError: vi.fn() }
vi.mock('@/stores/useUIStore', () => ({
  useUIStore: vi.fn(() => mockUIStoreState)
}))

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
}))

const basePrompt = {
  _id: 'prompt-1',
  title: 'Test Prompt',
  content: 'This is the prompt body.',
  tags: ['tag1']
}

function getWrapper(prompt = basePrompt) {
  return mount(UsePromptModal, { props: { prompt } })
}

describe('UsePromptModal', () => {
  it('renders the prompt title', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('Test Prompt')
  })

  it('renders the prompt content in a textarea', () => {
    const wrapper = getWrapper()
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.element.value).toBe('This is the prompt body.')
  })

  it('renders a copy button', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('promptDetail.copyBtn')
  })

  it('calls navigator.clipboard.writeText when copy button is clicked', async () => {
    const wrapper = getWrapper()
    // The copy button is the last button (close is first).
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This is the prompt body.')
  })

  it('calls uiStore.setSuccess on successful clipboard copy', async () => {
    const wrapper = getWrapper()
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(mockUIStoreState.setSuccess).toHaveBeenCalled()
  })

  it('renders tags when present', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('tag1')
  })

  it('renders a category badge when categoryId exists', () => {
    const prompt = { ...basePrompt, categoryId: { _id: 'cat-1', name: 'My Category' } }
    const wrapper = getWrapper(prompt)
    expect(wrapper.text()).toContain('My Category')
  })

  it('renders an uncategorized badge when no categoryId', () => {
    const prompt = { ...basePrompt, categoryId: null }
    const wrapper = getWrapper(prompt)
    expect(wrapper.text()).toContain('createPromptModal.uncategorized')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = getWrapper()
    // Close (X) button is the first one.
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renders a modal overlay (fixed positioning)', () => {
    const wrapper = getWrapper()
    expect(wrapper.classes()).toContain('fixed')
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
      const wrapper = mount(UsePromptModal, { props: { prompt: basePrompt }, attachTo: document.body })
      try {
        const panel = document.body.querySelector('[role="dialog"]') as HTMLElement
        expect(panel).not.toBeNull()
        expect(panel.getAttribute('aria-modal')).toBe('true')
        expect(panel.getAttribute('aria-label')).toBe('promptDetail.useTitle')
      } finally {
        wrapper.unmount()
      }
    })

    it('closes on Escape', async () => {
      const wrapper = mount(UsePromptModal, { props: { prompt: basePrompt }, attachTo: document.body })
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
      } finally {
        wrapper.unmount()
      }
    })

    it('moves focus into the dialog and restores the trigger on close', async () => {
      const wrapper = mount(UsePromptModal, { props: { prompt: basePrompt }, attachTo: document.body })
      await nextTick()
      const panel = document.body.querySelector('[role="dialog"]') as HTMLElement
      expect(panel.contains(document.activeElement)).toBe(true)
      wrapper.unmount()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
