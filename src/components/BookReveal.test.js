import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/animators/book-animator.js', () => ({
  animateBookReveal: vi.fn().mockResolvedValue(undefined),
}))

import BookReveal from './BookReveal.vue'
import { animateBookReveal } from '@/animators/book-animator.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BookReveal', () => {
  it('animates the given book and emits "complete" once finished', async () => {
    const book = { color: 'red', binding: 'leather', smell: 'old', interior: 'maps' }
    const wrapper = mount(BookReveal, { props: { book } })

    await flushPromises()

    expect(animateBookReveal).toHaveBeenCalledTimes(1)
    // Second argument is the book passed through.
    expect(animateBookReveal.mock.calls[0][1]).toEqual(book)
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
})
