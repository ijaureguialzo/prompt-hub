import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PromptCard from '@/components/PromptCard.vue'

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
}))

const basePrompt = {
  _id: 'prompt-1',
  title: 'Test Prompt Title',
  content: 'This is the prompt content.',
  tags: ['tag1', 'tag2']
}

// Stub router-link to render as an anchor element.
const routerLinkStub = { template: '<a><slot /></a>' }

function getWrapper(prompt = basePrompt) {
  return mount(PromptCard, {
    props: { prompt },
    global: { components: { routerLink: routerLinkStub } }
  })
}

describe('PromptCard', () => {
  it('renders the prompt title', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('Test Prompt Title')
  })

  it('renders the prompt content', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('This is the prompt content.')
  })

  it('renders a router-link around the title (not the whole card)', () => {
    const wrapper = getWrapper()
    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    // The link must carry the title text…
    expect(link.text()).toContain('Test Prompt Title')
    // …but no interactive element may live inside it (PLAN.md P2/13).
    expect(link.element.querySelectorAll('button, a, input')).toHaveLength(0)
  })

  it('renders the filter badges as real buttons', () => {
    const prompt = {
      ...basePrompt,
      categoryId: { _id: 'cat-1', name: 'My Category' }
    }
    const wrapper = getWrapper(prompt)
    const buttons = wrapper.findAll('button')
    // Category badge + the two tags
    expect(buttons).toHaveLength(3)
    expect(buttons[0].text()).toBe('My Category')
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

  it('emits filterByCategory when category badge is clicked', async () => {
    const prompt = { ...basePrompt, categoryId: { _id: 'cat-1', name: 'My Category' } }
    const wrapper = getWrapper(prompt)
    // The category badge is the first button.
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.emitted('filterByCategory')).toBeTruthy()
  })

  it('emits filterByTag for each tag when clicked', async () => {
    const wrapper = getWrapper()
    // The first button is the (uncategorized) category badge; the rest
    // are the tags.
    const buttons = wrapper.findAll('button')
    for (let i = 1; i < buttons.length; i++) {
      await buttons[i].trigger('click')
    }
    expect(wrapper.emitted('filterByTag')).toBeTruthy()
  })

  it('renders tags when present', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('tag1')
    expect(wrapper.text()).toContain('tag2')
  })

  it('does not render tags when tags array is empty', () => {
    const prompt = { ...basePrompt, tags: [] }
    const wrapper = getWrapper(prompt)
    expect(wrapper.text()).not.toContain('tag1')
  })

  it('does not crash when tags is undefined', () => {
    const prompt = { ...basePrompt, tags: undefined }
    const wrapper = getWrapper(prompt)
    // When categoryId is null and tags is undefined, only the
    // uncategorized button renders.
    expect(wrapper.findAll('button')).toHaveLength(1)
  })
})
