import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImportPromptsModal from '@/components/ImportPromptsModal.vue'

vi.mock('@/stores/useI18nStore.js', () => ({
  useI18nStore: vi.fn(() => ({ t: (key: string, _params?: Record<string, unknown>) => key })),
  resolve: vi.fn(),
  interpolate: vi.fn(),
  translateFrom: vi.fn()
}))

function makeEntries() {
  return [
    {
      index: 0,
      title: 'Brand new',
      status: 'new',
      existingId: null,
      existingTitle: null,
      selected: true
    },
    {
      index: 1,
      title: 'Already here',
      status: 'exists',
      existingId: 'p1',
      existingTitle: 'Already here',
      selected: false
    },
    { index: 2, title: 'Again', status: 'duplicate', selected: false },
    { index: 3, title: 'Broken', status: 'invalid', invalidReason: 'title', selected: false }
  ] as never[]
}

function mountModal(overrides: Record<string, unknown> = {}) {
  return mount(ImportPromptsModal, {
    props: {
      entries: makeEntries(),
      quota: { used: 1, limit: 200, wouldUse: 2, exceeded: false },
      importing: false,
      fileName: 'backup.zip',
      ...overrides
    }
  })
}

describe('ImportPromptsModal', () => {
  it('renders every row with a status badge', () => {
    const wrapper = mountModal()
    // The i18n mock returns the key, so badges show their locale keys
    expect(wrapper.text()).toContain('Brand new')
    expect(wrapper.text()).toContain('importModal.newBadge')
    expect(wrapper.text()).toContain('importModal.existsBadge')
    expect(wrapper.text()).toContain('importModal.duplicateBadge')
    expect(wrapper.text()).toContain('importModal.invalidBadge')
  })

  it('shows the overwrite hint on existing rows', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('importModal.overwriteHint')
  })

  it('selects "new" rows by default and leaves conflicts/duplicates/invalid unchecked', async () => {
    const wrapper = mountModal()
    const boxes = wrapper.findAll('input[type="checkbox"]')
    expect(boxes).toHaveLength(4)
    expect(boxes.map((b) => b.element.checked)).toEqual([true, false, false, false])
    // Non-importable rows are disabled
    expect((boxes[2].element as HTMLInputElement).disabled).toBe(true)
    expect((boxes[3].element as HTMLInputElement).disabled).toBe(true)
  })

  it('emits confirm with the selected conflict indices only', async () => {
    const wrapper = mountModal()
    // Select the existing row (index 1)
    const boxes = wrapper.findAll('input[type="checkbox"]')
    await boxes[1].setChecked(true)
    await wrapper.find('button.bg-indigo-600').trigger('click')

    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')![0][0]).toEqual([1])
  })

  it('select-all / deselect-all only touch importable rows', async () => {
    const wrapper = mountModal()
    const buttons = wrapper.findAll('button')
    const selectAll = buttons.find((b) => b.text() === 'importModal.selectAll')!
    const deselectAll = buttons.find((b) => b.text() === 'importModal.deselectAll')!

    await selectAll.trigger('click')
    expect(wrapper.findAll('input[type="checkbox"]').map((b) => b.element.checked)).toEqual([
      true,
      true,
      false,
      false
    ])

    await deselectAll.trigger('click')
    expect(wrapper.findAll('input[type="checkbox"]').map((b) => b.element.checked)).toEqual([
      false,
      false,
      false,
      false
    ])

    // With nothing selected the import button is disabled
    const importBtn = wrapper.find('button.bg-indigo-600')
    expect((importBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables import while the request is in flight', () => {
    const wrapper = mountModal({ importing: true })
    const importBtn = wrapper.find('button.bg-indigo-600')
    expect((importBtn.element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('importModal.importing')
  })

  it('shows the quota warning and disables import when the quota would be exceeded', () => {
    const wrapper = mountModal({
      quota: { used: 199, limit: 200, wouldUse: 201, exceeded: true }
    })
    expect(wrapper.text()).toContain('importModal.quotaWarning')
    const importBtn = wrapper.find('button.bg-indigo-600')
    expect((importBtn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows the invalid-entries note and the summary', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('importModal.invalidNote')
    expect(wrapper.text()).toContain('importModal.summary')
  })

  it('emits close from the header button', async () => {
    const wrapper = mountModal()
    await wrapper.find('button').trigger('click') // first button = close (X)
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
