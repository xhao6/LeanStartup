import { describe, it, expect } from 'vitest'
import {
  formatProgress,
  buildCaseDetailUrl,
  buildHeaderText,
  canLoadMore
} from '@/pages/favorites/helpers'

// ─── formatProgress ───────────────────────────────────────────────────

describe('formatProgress', () => {
  it('formats normal progress', () => {
    expect(formatProgress({ completed_count: 2, steps_count: 5 })).toBe('2/5')
  })

  it('formats zero progress', () => {
    expect(formatProgress({ completed_count: 0, steps_count: 3 })).toBe('0/3')
  })

  it('formats fully completed', () => {
    expect(formatProgress({ completed_count: 5, steps_count: 5 })).toBe('5/5')
  })

  it('treats undefined completed_count as 0', () => {
    expect(formatProgress({ completed_count: undefined as any, steps_count: 5 })).toBe('0/5')
  })

  it('treats undefined steps_count as 0', () => {
    expect(formatProgress({ completed_count: 2, steps_count: undefined as any })).toBe('2/0')
  })

  it('treats both undefined as 0/0', () => {
    expect(formatProgress({ completed_count: undefined as any, steps_count: undefined as any })).toBe('0/0')
  })
})

// ─── buildCaseDetailUrl ───────────────────────────────────────────────

describe('buildCaseDetailUrl', () => {
  it('builds correct URL with case_id', () => {
    expect(buildCaseDetailUrl('case-123')).toBe('/pages/case-detail/index?case_id=case-123')
  })

  it('handles case_id with special characters', () => {
    expect(buildCaseDetailUrl('abc_def-456')).toBe('/pages/case-detail/index?case_id=abc_def-456')
  })
})

// ─── buildHeaderText ──────────────────────────────────────────────────

describe('buildHeaderText', () => {
  it('shows plain title when total is 0', () => {
    expect(buildHeaderText(0)).toBe('我的收藏')
  })

  it('shows count when total > 0', () => {
    expect(buildHeaderText(3)).toBe('我的收藏 (3个)')
  })

  it('shows count for large totals', () => {
    expect(buildHeaderText(100)).toBe('我的收藏 (100个)')
  })

  it('shows count for 1 item', () => {
    expect(buildHeaderText(1)).toBe('我的收藏 (1个)')
  })
})

// ─── canLoadMore ──────────────────────────────────────────────────────

describe('canLoadMore', () => {
  it('returns true when more items available', () => {
    expect(canLoadMore(10, 30, false)).toBe(true)
  })

  it('returns false when all loaded', () => {
    expect(canLoadMore(30, 30, false)).toBe(false)
  })

  it('returns false when loading', () => {
    expect(canLoadMore(10, 30, true)).toBe(false)
  })

  it('returns false when total is 0', () => {
    expect(canLoadMore(0, 0, false)).toBe(false)
  })

  it('returns false when current exceeds total', () => {
    expect(canLoadMore(30, 20, false)).toBe(false)
  })
})
