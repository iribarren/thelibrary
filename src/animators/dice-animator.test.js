import { describe, it, expect } from 'vitest'
import {
  getEffectText,
  clampD6,
  buildReelNumbers,
  getReelFinalOffset,
  getD6LandRotation,
  dieBeatsAction,
  buildDicePlaceholder,
} from './dice-animator.js'

// These tests pin the frontend's display logic to the BACKEND CONTRACT exercised
// by Behat (oracles-api/features/chapters.feature and epilogue.feature) and
// GameEngine. When the rules change in the backend, these must be updated together.

// ── getEffectText — chapter (mirrors chapters.feature) ───────────────────────
// hit → background +1, weak_hit → support +1, miss → background -1

describe('getEffectText — chapter', () => {
  it('hit raises the Trasfondo (background) by one', () => {
    const text = getEffectText('hit', 'chapter')
    expect(text).toContain('Trasfondo')
    expect(text).toContain('aumenta')
  })

  it('weak_hit raises the Apoyo (support) by one', () => {
    const text = getEffectText('weak_hit', 'chapter')
    expect(text).toContain('Apoyo')
    expect(text).toContain('aumenta')
  })

  it('miss lowers the Trasfondo (background) by one', () => {
    const text = getEffectText('miss', 'chapter')
    expect(text).toContain('Trasfondo')
    expect(text).toContain('disminuye')
  })
})

// ── getEffectText — epilogue action (mirrors epilogue.feature) ────────────────
// CONTRACT: GameEngine::resolveEpilogueAction → overcome score +3 / +2 / +1.
// A miss STILL adds one point (epilogue.feature: "still adds one").

describe('getEffectText — epilogue_action (overcome score +3/+2/+1)', () => {
  it('hit awards three overcome points', () => {
    expect(getEffectText('hit', 'epilogue_action')).toContain('3')
  })

  it('weak_hit awards two overcome points', () => {
    expect(getEffectText('weak_hit', 'epilogue_action')).toContain('2')
  })

  it('miss still awards one overcome point (not zero)', () => {
    const text = getEffectText('miss', 'epilogue_action')
    expect(text).toContain('1')
    // Guard against the previous bug that displayed "No ganas puntos".
    expect(text).not.toMatch(/No ganas/i)
  })
})

// ── getEffectText — epilogue final (mirrors resolveFinalRoll) ─────────────────
// CONTRACT: the final roll awards NO points; it only decides the ending
// (overcome score vs 2d10 → hit beats both / weak_hit beats one / miss beats none).

describe('getEffectText — epilogue_final (no points, just the ending)', () => {
  it('hit describes a complete triumph without claiming a point gain', () => {
    const text = getEffectText('hit', 'epilogue_final')
    expect(text).toMatch(/Triunfo/i)
    expect(text).not.toMatch(/\+\s*\d/)
  })

  it('weak_hit describes a partial success', () => {
    expect(getEffectText('weak_hit', 'epilogue_final')).toMatch(/parcial/i)
  })

  it('miss describes a defeat', () => {
    expect(getEffectText('miss', 'epilogue_final')).toMatch(/Derrota/i)
  })
})

// ── dieBeatsAction (mirrors comparison: die >= action_score) ──────────────────

describe('dieBeatsAction', () => {
  it('a die equal to the action score beats it', () => {
    expect(dieBeatsAction(5, 5)).toBe(true)
  })

  it('a die greater than the action score beats it', () => {
    expect(dieBeatsAction(9, 5)).toBe(true)
  })

  it('a die lower than the action score loses', () => {
    expect(dieBeatsAction(3, 5)).toBe(false)
  })
})

// ── clampD6 ──────────────────────────────────────────────────────────────────

describe('clampD6', () => {
  it('leaves valid 1-6 values unchanged', () => {
    expect([1, 2, 3, 4, 5, 6].map(clampD6)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('wraps values above 6 back into 1-6', () => {
    expect(clampD6(7)).toBe(1)
    expect(clampD6(12)).toBe(6)
  })

  it('wraps values below 1 back into 1-6', () => {
    expect(clampD6(0)).toBe(6)
    expect(clampD6(-1)).toBe(5)
  })
})

// ── buildReelNumbers ─────────────────────────────────────────────────────────

describe('buildReelNumbers', () => {
  it('produces 2*extra + 1 entries', () => {
    expect(buildReelNumbers(7, 9)).toHaveLength(19)
  })

  it('places the final value at the centre index (= extra)', () => {
    const extra = 9
    const reel = buildReelNumbers(4, extra)
    expect(reel[extra]).toBe(4)
  })

  it('never repeats the final value in the surrounding filler slots', () => {
    const extra = 9
    const finalValue = 6
    const reel = buildReelNumbers(finalValue, extra)
    reel.forEach((n, i) => {
      if (i !== extra) expect(n).not.toBe(finalValue)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(10)
    })
  })
})

// ── getReelFinalOffset / getD6LandRotation ───────────────────────────────────

describe('getReelFinalOffset', () => {
  it('returns the constant offset that centres the final slot', () => {
    // -(9 * 28) + (40 - 14) = -226
    expect(getReelFinalOffset(7)).toBe(-226)
  })
})

describe('getD6LandRotation', () => {
  it('always lands on the front face (multiples of 360)', () => {
    expect(getD6LandRotation(1)).toEqual([720, 720])
    expect(getD6LandRotation(6)).toEqual([720, 720])
  })
})

// ── buildDicePlaceholder (structural) ────────────────────────────────────────

describe('buildDicePlaceholder', () => {
  it('renders a d6 group and two d10 placeholders for chapter context', () => {
    const el = buildDicePlaceholder('chapter')
    expect(el.querySelector('.d6-placeholder-box')).not.toBeNull()
    expect(el.querySelectorAll('.d10-placeholder-box')).toHaveLength(2)
    expect(el.querySelector('.dice-math-breakdown')).not.toBeNull()
  })

  it('renders the overcome score block (no d6, no math) for epilogue_final', () => {
    const el = buildDicePlaceholder('epilogue_final')
    expect(el.querySelector('.overcome-score-display')).not.toBeNull()
    expect(el.querySelector('.d6-placeholder-box')).toBeNull()
    expect(el.querySelector('.dice-math-breakdown')).toBeNull()
  })
})
