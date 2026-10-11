import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SearchBar from '@/components/SearchBar.vue'

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string) => key }))
}))

describe('SearchBar', () => {
  it('renders an input with the correct placeholder and an accessible name', () => {
    const wrapper = mount(SearchBar)
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('searchBar.placeholder')
    // A placeholder is not an accessible name — the input needs its own
    // aria-label (PLAN.md P2/14).
    expect(input.attributes('aria-label')).toBe('searchBar.placeholder')
  })

  it('emits update:modelValue when the user types', async () => {
    const wrapper = mount(SearchBar)
    const input = wrapper.find('input')
    await input.setValue('search term')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['search term'])
  })

  it('displays the initial modelValue', () => {
    const wrapper = mount(SearchBar, { props: { modelValue: 'initial text' } })
    expect(wrapper.find('input').element.value).toBe('initial text')
  })

  it('updates when modelValue prop changes', async () => {
    const wrapper = mount(SearchBar, { props: { modelValue: 'initial' } })
    await wrapper.setProps({ modelValue: 'updated' })
    expect(wrapper.find('input').element.value).toBe('updated')
  })

  it('renders an SVG icon', () => {
    const wrapper = mount(SearchBar)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
