import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from './Modal.vue'

// Stub Teleport so the modal content renders inside the wrapper for querying.
function mountModal(props = {}, slot = '<p class="content">Hi</p>') {
  return mount(Modal, {
    props,
    slots: { default: slot },
    global: { stubs: { teleport: true } },
  })
}

describe('Modal', () => {
  it('does not render anything when closed', () => {
    const wrapper = mountModal({ open: false })
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('renders the overlay and slot content when open', () => {
    const wrapper = mountModal({ open: true, title: 'My modal' })
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.content').text()).toBe('Hi')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mountModal({ open: true })
    await wrapper.find('.modal-close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when clicking the overlay backdrop', async () => {
    const wrapper = mountModal({ open: true })
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close when clicking inside the dialog', async () => {
    const wrapper = mountModal({ open: true })
    await wrapper.find('.modal').trigger('click')
    expect(wrapper.emitted('close')).toBeFalsy()
  })
})
