import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock vue-router so useRouter() returns a router whose push we can assert on.
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import { useNavigation } from './useNavigation.js'

beforeEach(() => {
  push.mockClear()
})

describe('useNavigation — navigateToPhase', () => {
  it('navigates home when phase is missing', () => {
    useNavigation().navigateToPhase(null)
    expect(push).toHaveBeenCalledWith('/')
  })

  it('routes the prologue to the prologue view', () => {
    useNavigation().navigateToPhase('prologue')
    expect(push).toHaveBeenCalledWith('/aventura-rapida/prologue')
  })

  it('routes any chapter_* phase to the chapter view', () => {
    const { navigateToPhase } = useNavigation()
    navigateToPhase('chapter_1')
    navigateToPhase('chapter_3')
    expect(push).toHaveBeenNthCalledWith(1, '/aventura-rapida/chapter')
    expect(push).toHaveBeenNthCalledWith(2, '/aventura-rapida/chapter')
  })

  it('routes any epilogue* phase to the epilogue view', () => {
    const { navigateToPhase } = useNavigation()
    navigateToPhase('epilogue_action_1')
    navigateToPhase('epilogue_final')
    expect(push).toHaveBeenNthCalledWith(1, '/aventura-rapida/epilogue')
    expect(push).toHaveBeenNthCalledWith(2, '/aventura-rapida/epilogue')
  })

  it('routes the completed phase to the completed view', () => {
    useNavigation().navigateToPhase('completed')
    expect(push).toHaveBeenCalledWith('/aventura-rapida/completed')
  })

  it('falls back home for an unknown phase', () => {
    useNavigation().navigateToPhase('something_unknown')
    expect(push).toHaveBeenCalledWith('/')
  })
})
