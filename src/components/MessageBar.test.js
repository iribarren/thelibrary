import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageBar from './MessageBar.vue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MessageBar', () => {
  it('renders nothing when there is no message', () => {
    const wrapper = mount(MessageBar, { props: { message: '' } })
    expect(wrapper.find('.message-bar').exists()).toBe(false)
  })

  it('shows the message with the visible class when a message is set', () => {
    const wrapper = mount(MessageBar, { props: { message: 'Something went wrong' } })
    const bar = wrapper.find('.message-bar')
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toContain('Something went wrong')
    expect(bar.classes()).toContain('visible')
  })

  it('applies the message type as a class', () => {
    const wrapper = mount(MessageBar, { props: { message: 'Saved', type: 'success' } })
    expect(wrapper.find('.message-bar').classes()).toContain('success')
  })

  it('auto-hides (drops the visible class) after 8 seconds', async () => {
    const wrapper = mount(MessageBar, { props: { message: 'Temporary' } })
    expect(wrapper.find('.message-bar').classes()).toContain('visible')

    vi.advanceTimersByTime(8000)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.message-bar').classes()).not.toContain('visible')
  })
})
