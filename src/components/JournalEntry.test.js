import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import JournalEntry from './JournalEntry.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: { journal: { write_before_continue: 'Write something before continuing.' } },
  },
})

function mountEntry(props = {}) {
  return mount(JournalEntry, {
    props: { label: 'Your notes', submitLabel: 'Save', ...props },
    global: { plugins: [i18n] },
  })
}

describe('JournalEntry', () => {
  it('does not emit save and shows an error when the textarea is empty', async () => {
    const wrapper = mountEntry()

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('save')).toBeFalsy()
    expect(wrapper.text()).toContain('Write something before continuing.')
  })

  it('does not emit save for whitespace-only content', async () => {
    const wrapper = mountEntry()

    await wrapper.find('textarea').setValue('    ')
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('emits save with trimmed content and the bookId', async () => {
    const wrapper = mountEntry({ bookId: 42 })

    await wrapper.find('textarea').setValue('  The rain fell hard.  ')
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('save')).toHaveLength(1)
    expect(wrapper.emitted('save')[0][0]).toEqual({
      content: 'The rain fell hard.',
      bookId: 42,
    })
  })

  it('passes a null bookId through when none is provided', async () => {
    const wrapper = mountEntry()

    await wrapper.find('textarea').setValue('A note')
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('save')[0][0].bookId).toBeNull()
  })
})
