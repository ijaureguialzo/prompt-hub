import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
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

  describe('unresolved category hint (PLAN.md P2/15)', () => {
    it('shows the hint when the server could not resolve the row category', () => {
      const wrapper = mount(ImportPromptsModal, {
        props: {
          entries: [
            {
              index: 0,
              title: 'Orphaned',
              status: 'new',
              categoryName: 'Foreign',
              categoryResolved: false,
              selected: true
            }
          ],
          fileName: 'backup.json'
        }
      })
      expect(wrapper.text()).toContain('importModal.categoryUnresolved')
    })

    it('omits the hint when the category resolves or the flag is unknown', () => {
      const withFlag = mount(ImportPromptsModal, {
        props: {
          entries: [
            {
              index: 0,
              title: 'Known',
              status: 'new',
              categoryName: 'Foreign',
              categoryResolved: true,
              selected: true
            }
          ]
        }
      })
      expect(withFlag.text()).not.toContain('importModal.categoryUnresolved')

      const withoutFlag = mount(ImportPromptsModal, {
        props: {
          entries: [
            {
              index: 0,
              title: 'Unknown flag',
              status: 'new',
              categoryName: 'Foreign',
              categoryResolved: null,
              selected: true
            }
          ]
        }
      })
      expect(withoutFlag.text()).not.toContain('importModal.categoryUnresolved')
    })
  })

  describe('category-creation notice (missing categories are created on apply)', () => {
    it('shows the creation hint (not the unresolved warning) when the server will create the category', () => {
      const wrapper = mount(ImportPromptsModal, {
        props: {
          entries: [
            {
              index: 0,
              title: 'New cat',
              status: 'new',
              categoryName: 'Foreign',
              categoryResolved: true,
              categoryWillBeCreated: true,
              selected: true
            }
          ],
          categories: ['Foreign']
        }
      })
      expect(wrapper.text()).toContain('importModal.categoryWillBeCreated')
      expect(wrapper.text()).not.toContain('importModal.categoryUnresolved')
      // The summary banner lists the names the apply will create.
      expect(wrapper.text()).toContain('importModal.categoriesToCreate')
    })

    it('omits the banner when nothing will be created', () => {
      const wrapper = mount(ImportPromptsModal, {
        props: {
          entries: [
            {
              index: 0,
              title: 'Known',
              status: 'new',
              categoryName: 'Mine',
              categoryResolved: true,
              categoryWillBeCreated: false,
              selected: true
            }
          ]
        }
      })
      expect(wrapper.text()).not.toContain('importModal.categoriesToCreate')
      expect(wrapper.text()).not.toContain('importModal.categoryWillBeCreated')
    })
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
      const wrapper = mount(ImportPromptsModal, { props: { entries: [] }, attachTo: document.body })
      try {
        const panel = wrapper.find('[role="dialog"]')
        expect(panel.attributes('aria-modal')).toBe('true')
        expect(panel.attributes('aria-label')).toBe('importModal.title')
      } finally {
        wrapper.unmount()
      }
    })

    it('closes on Escape', async () => {
      const wrapper = mount(ImportPromptsModal, { props: { entries: [] }, attachTo: document.body })
      try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
      } finally {
        wrapper.unmount()
      }
    })

    it('moves focus into the dialog and restores the trigger on close', async () => {
      const wrapper = mount(ImportPromptsModal, { props: { entries: [] }, attachTo: document.body })
      await nextTick()
      const panel = wrapper.find('[role="dialog"]').element
      expect(panel.contains(document.activeElement)).toBe(true)
      wrapper.unmount()
      expect(document.activeElement).toBe(trigger)
    })
  })
})
