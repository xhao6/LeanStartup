import { describe, it, expect } from 'vitest'
import {
  getScoreFontSize,
  formatScoreDisplay,
  getMorandiColor,
  distributeTagColors,
  getRankGradient,
  isTopRank,
  getCostTagStyle,
  parseSuitableFor
} from '@/components/helpers'

// ─── ScoreBadge helpers ───────────────────────────────────────────────

describe('getScoreFontSize', () => {
  it('returns correct font size for sm', () => {
    expect(getScoreFontSize('sm')).toBe('14px')
  })
  it('returns correct font size for md', () => {
    expect(getScoreFontSize('md')).toBe('18px')
  })
  it('returns correct font size for lg', () => {
    expect(getScoreFontSize('lg')).toBe('48px')
  })
})

describe('formatScoreDisplay', () => {
  it('formats a normal score', () => {
    expect(formatScoreDisplay(85)).toBe('85')
  })
  it('rounds decimal scores', () => {
    expect(formatScoreDisplay(85.7)).toBe('86')
  })
  it('shows -- for NaN', () => {
    expect(formatScoreDisplay(NaN)).toBe('--')
  })
  it('shows -- for Infinity', () => {
    expect(formatScoreDisplay(Infinity)).toBe('--')
  })
  it('formats zero', () => {
    expect(formatScoreDisplay(0)).toBe('0')
  })
})

// ─── TagMor helpers ───────────────────────────────────────────────────

describe('getMorandiColor', () => {
  it('returns first Morandi color for index 0', () => {
    const c = getMorandiColor(0)
    expect(c.bg).toBe('#E8D5C4')
    expect(c.text).toBe('#5D4E37')
  })
  it('returns last Morandi color for index 4', () => {
    const c = getMorandiColor(4)
    expect(c.bg).toBe('#DFDBD0')
    expect(c.text).toBe('#5C5A4F')
  })
  it('clamps negative index to 0', () => {
    const c = getMorandiColor(-3)
    expect(c).toEqual(getMorandiColor(0))
  })
  it('clamps overflow index to last', () => {
    const c = getMorandiColor(99)
    expect(c).toEqual(getMorandiColor(4))
  })
})

describe('distributeTagColors', () => {
  it('distributes 3 tags round-robin', () => {
    expect(distributeTagColors(3)).toEqual([0, 1, 2])
  })
  it('wraps around at 5', () => {
    expect(distributeTagColors(7)).toEqual([0, 1, 2, 3, 4, 0, 1])
  })
  it('respects startOffset', () => {
    expect(distributeTagColors(3, 2)).toEqual([2, 3, 4])
  })
  it('returns empty for count 0', () => {
    expect(distributeTagColors(0)).toEqual([])
  })
})

// ─── CaseCard helpers ─────────────────────────────────────────────────

describe('getRankGradient', () => {
  it('returns gold gradient for rank 1', () => {
    expect(getRankGradient(1)).toContain('#FBBF24')
  })
  it('returns silver gradient for rank 2', () => {
    expect(getRankGradient(2)).toContain('#94A3B8')
  })
  it('returns bronze gradient for rank 3', () => {
    expect(getRankGradient(3)).toContain('#D4A574')
  })
  it('returns undefined for rank 4', () => {
    expect(getRankGradient(4)).toBeUndefined()
  })
  it('returns undefined for rank 0', () => {
    expect(getRankGradient(0)).toBeUndefined()
  })
})

describe('isTopRank', () => {
  it('rank 1-3 are top ranks', () => {
    expect(isTopRank(1)).toBe(true)
    expect(isTopRank(2)).toBe(true)
    expect(isTopRank(3)).toBe(true)
  })
  it('rank 0 and 4+ are not top ranks', () => {
    expect(isTopRank(0)).toBe(false)
    expect(isTopRank(4)).toBe(false)
    expect(isTopRank(-1)).toBe(false)
  })
})

describe('getCostTagStyle', () => {
  it('returns green style for 零成本', () => {
    const style = getCostTagStyle('零成本')
    expect(style.bg).toBe('#D1FAE5')
    expect(style.text).toBe('#059669')
  })
  it('returns blue style for 低门槛', () => {
    const style = getCostTagStyle('低门槛')
    expect(style.bg).toBe('#DBEAFE')
    expect(style.text).toBe('#2563EB')
  })
  it('returns default style for unknown cost', () => {
    const style = getCostTagStyle('高投入')
    expect(style.bg).toBe('#FAFAF8')
    expect(style.text).toBe('#4A4A68')
  })
})

describe('parseSuitableFor', () => {
  it('parses comma-separated string (Chinese comma)', () => {
    expect(parseSuitableFor('上班族，宝妈')).toEqual(['上班族', '宝妈'])
  })
  it('parses comma-separated string (English comma)', () => {
    expect(parseSuitableFor('student, freelancer')).toEqual(['student', 'freelancer'])
  })
  it('parses array directly', () => {
    expect(parseSuitableFor(['a', 'b'])).toEqual(['a', 'b'])
  })
  it('filters empty strings', () => {
    expect(parseSuitableFor('a,,b')).toEqual(['a', 'b'])
  })
  it('returns empty for undefined', () => {
    expect(parseSuitableFor(undefined)).toEqual([])
  })
  it('returns empty for empty string', () => {
    expect(parseSuitableFor('')).toEqual([])
  })
  it('handles dun-hao separator', () => {
    expect(parseSuitableFor('上班族、自由职业')).toEqual(['上班族', '自由职业'])
  })
})
