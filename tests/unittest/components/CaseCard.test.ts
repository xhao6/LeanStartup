import { describe, it, expect } from 'vitest'
import {
  getRankGradient,
  isTopRank,
  getCostTagStyle,
  parseSuitableFor,
  type CaseData
} from '@/components/helpers'

describe('CaseCard logic', () => {
  // ─── Rank badge ───────────────────────────────────────────────────

  describe('getRankGradient', () => {
    it('provides gold gradient for rank 1', () => {
      expect(getRankGradient(1)).toBe('linear-gradient(180deg, #FBBF24, #F97316)')
    })
    it('provides silver gradient for rank 2', () => {
      expect(getRankGradient(2)).toBe('linear-gradient(180deg, #94A3B8, #64748B)')
    })
    it('provides bronze gradient for rank 3', () => {
      expect(getRankGradient(3)).toBe('linear-gradient(180deg, #D4A574, #B8956C)')
    })
    it('returns undefined for rank 4+', () => {
      expect(getRankGradient(4)).toBeUndefined()
      expect(getRankGradient(10)).toBeUndefined()
    })
    it('returns undefined for rank 0', () => {
      expect(getRankGradient(0)).toBeUndefined()
    })
  })

  describe('isTopRank', () => {
    it('returns true for ranks 1-3', () => {
      expect(isTopRank(1)).toBe(true)
      expect(isTopRank(2)).toBe(true)
      expect(isTopRank(3)).toBe(true)
    })
    it('returns false otherwise', () => {
      expect(isTopRank(0)).toBe(false)
      expect(isTopRank(4)).toBe(false)
      expect(isTopRank(-1)).toBe(false)
    })
  })

  // ─── Cost tag ─────────────────────────────────────────────────────

  describe('getCostTagStyle', () => {
    it('maps 零成本 to green style', () => {
      const s = getCostTagStyle('零成本')
      expect(s).toEqual({ bg: '#D1FAE5', text: '#059669' })
    })
    it('maps 低门槛 to blue style', () => {
      const s = getCostTagStyle('低门槛')
      expect(s).toEqual({ bg: '#DBEAFE', text: '#2563EB' })
    })
    it('falls back to neutral style for unknown cost', () => {
      const s = getCostTagStyle('中等投入')
      expect(s).toEqual({ bg: '#FAFAF8', text: '#4A4A68' })
    })
    it('handles empty string as unknown', () => {
      const s = getCostTagStyle('')
      expect(s).toEqual({ bg: '#FAFAF8', text: '#4A4A68' })
    })
  })

  // ─── Suitable-for tag parsing ─────────────────────────────────────

  describe('parseSuitableFor', () => {
    it('parses Chinese-comma separated string', () => {
      expect(parseSuitableFor('上班族，宝妈，大学生')).toEqual(['上班族', '宝妈', '大学生'])
    })
    it('parses English-comma separated string', () => {
      expect(parseSuitableFor('A, B, C')).toEqual(['A', 'B', 'C'])
    })
    it('parses dun-hao separated string', () => {
      expect(parseSuitableFor('自由职业者、全职宝妈')).toEqual(['自由职业者', '全职宝妈'])
    })
    it('passes through arrays', () => {
      expect(parseSuitableFor(['tag1', 'tag2'])).toEqual(['tag1', 'tag2'])
    })
    it('filters out empty entries from arrays', () => {
      expect(parseSuitableFor(['a', '', 'b'])).toEqual(['a', 'b'])
    })
    it('returns empty for undefined', () => {
      expect(parseSuitableFor(undefined)).toEqual([])
    })
    it('returns empty for empty string', () => {
      expect(parseSuitableFor('')).toEqual([])
    })
  })

  // ─── Integration: full case data flow ─────────────────────────────

  describe('full case data integration', () => {
    const mockCase: CaseData = {
      id: 'case-001',
      title: '社区团购小程序',
      summary: '利用社区信任关系做团购',
      score_total: 85,
      cost: '零成本',
      source_account: '创业笔记',
      suitable_for: ['宝妈', '社区运营']
    }

    it('computes correct rank badge style for rank 1', () => {
      expect(getRankGradient(1)).toBeDefined()
      expect(isTopRank(1)).toBe(true)
    })

    it('computes cost style for 零成本', () => {
      expect(getCostTagStyle(mockCase.cost).bg).toBe('#D1FAE5')
    })

    it('parses suitable_for correctly', () => {
      expect(parseSuitableFor(mockCase.suitable_for)).toEqual(['宝妈', '社区运营'])
    })
  })
})
