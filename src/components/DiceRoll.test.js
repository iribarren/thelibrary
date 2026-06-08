import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mock the animator so the component is tested in isolation (no real timers/DOM animation).
vi.mock('@/animators/dice-animator.js', () => ({
  animateDiceRoll: vi.fn().mockResolvedValue(undefined),
  buildDicePlaceholder: vi.fn(() => {
    const el = document.createElement('div')
    el.className = 'placeholder-stub'
    return el
  }),
}))

import DiceRoll from './DiceRoll.vue'
import { animateDiceRoll, buildDicePlaceholder } from '@/animators/dice-animator.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DiceRoll', () => {
  it('renders the placeholder on mount when there is no result yet', () => {
    mount(DiceRoll, { props: { context: 'chapter' } })

    expect(buildDicePlaceholder).toHaveBeenCalledWith('chapter')
    expect(animateDiceRoll).not.toHaveBeenCalled()
  })

  it('does not render the placeholder when a result is already present', () => {
    mount(DiceRoll, { props: { context: 'chapter', result: { outcome: 'hit' } } })

    expect(buildDicePlaceholder).not.toHaveBeenCalled()
  })

  it('runs the animation and emits "complete" when a result arrives', async () => {
    const wrapper = mount(DiceRoll, { props: { context: 'epilogue_action', result: null } })

    await wrapper.setProps({ result: { outcome: 'weak_hit' }, extraData: { overcome_score: 5 } })
    await flushPromises()

    expect(animateDiceRoll).toHaveBeenCalledTimes(1)
    const [, roll, context, extra] = animateDiceRoll.mock.calls[0]
    expect(roll).toEqual({ outcome: 'weak_hit' })
    expect(context).toBe('epilogue_action')
    expect(extra).toEqual({ overcome_score: 5 })
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })

  it('re-animates when the result prop changes again', async () => {
    const wrapper = mount(DiceRoll, { props: { context: 'chapter', result: null } })

    await wrapper.setProps({ result: { outcome: 'hit' } })
    await flushPromises()
    await wrapper.setProps({ result: { outcome: 'miss' } })
    await flushPromises()

    expect(animateDiceRoll).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('complete')).toHaveLength(2)
  })
})
