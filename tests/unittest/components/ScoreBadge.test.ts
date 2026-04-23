import { describe, it, expect } from 'vitest'
import { formatScoreDisplay, getScoreFontSize } from '@/components/helpers'

describe('ScoreBadge logic', () => {
  describe('formatScoreDisplay', () => {
    it('displays integer score', () => {
      expect(formatScoreDisplay(92)).toBe('92')
    })

    it('rounds fractional scores', () => {
      expect(formatScoreDisplay(87.4)).toBe('87')
      expect(formatScoreDisplay(87.5)).toBe('88')
    })

    it('handles edge: zero', () => {
      expect(formatScoreDisplay(0)).toBe('0')
    })

    it('handles edge: NaN shows placeholder', () => {
      expect(formatScoreDisplay(NaN)).toBe('--')
    })

    it('handles edge: Infinity shows placeholder', () => {
      expect(formatScoreDisplay(Infinity)).toBe('--')
      expect(formatScoreDisplay(-Infinity)).toBe('--')
    })
  })

  describe('getScoreFontSize', () => {
    it.each([
      ['sm', '14px'],
      ['md', '18px'],
      ['lg', '48px']
    ] as const)('size %s -> %s', (size, expected) => {
      expect(getScoreFontSize(size)).toBe(expected)
    })
  })
})
