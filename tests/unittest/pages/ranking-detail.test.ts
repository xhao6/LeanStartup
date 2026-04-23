import { describe, it, expect } from 'vitest'
import { formatDateChinese, getWeekdayName, buildShareTitle } from '@/pages/ranking-detail/helpers'

describe('ranking-detail helpers', () => {
  describe('formatDateChinese', () => {
    it('converts ISO date to Chinese format', () => {
      expect(formatDateChinese('2026-04-23')).toBe('2026年4月23日')
    })

    it('handles Jan 1', () => {
      expect(formatDateChinese('2026-01-01')).toBe('2026年1月1日')
    })

    it('handles Dec 31', () => {
      expect(formatDateChinese('2026-12-31')).toBe('2026年12月31日')
    })

    it('handles leap year Feb 29', () => {
      expect(formatDateChinese('2028-02-29')).toBe('2028年2月29日')
    })

    it('returns empty for invalid date', () => {
      expect(formatDateChinese('')).toBe('')
      expect(formatDateChinese('not-a-date')).toBe('')
    })
  })

  describe('getWeekdayName', () => {
    it('returns correct weekday for known dates', () => {
      // 2026-04-23 is Thursday
      expect(getWeekdayName('2026-04-23')).toBe('周四')
      // 2026-01-01 is Thursday
      expect(getWeekdayName('2026-01-01')).toBe('周四')
      // 2026-04-19 is Sunday
      expect(getWeekdayName('2026-04-19')).toBe('周日')
    })

    it('covers all 7 weekdays', () => {
      // 2026-04-19 Sun through 2026-04-25 Sat
      expect(getWeekdayName('2026-04-19')).toBe('周日')
      expect(getWeekdayName('2026-04-20')).toBe('周一')
      expect(getWeekdayName('2026-04-21')).toBe('周二')
      expect(getWeekdayName('2026-04-22')).toBe('周三')
      expect(getWeekdayName('2026-04-23')).toBe('周四')
      expect(getWeekdayName('2026-04-24')).toBe('周五')
      expect(getWeekdayName('2026-04-25')).toBe('周六')
    })

    it('returns empty for invalid date', () => {
      expect(getWeekdayName('')).toBe('')
      expect(getWeekdayName('invalid')).toBe('')
    })
  })

  describe('buildShareTitle', () => {
    it('builds share title with Chinese date', () => {
      expect(buildShareTitle('2026-04-23')).toBe('精益副业案例库 - 2026年4月23日榜单')
    })

    it('falls back to default for invalid date', () => {
      expect(buildShareTitle('')).toBe('精益副业案例库')
    })
  })
})
