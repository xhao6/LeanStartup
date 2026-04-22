// tests/unittest/cloudfunctions/shared/date.test.js
import { describe, it, expect } from 'vitest'
import { formatDateTime, getTodayDate, getDaysAgoDate } from '../../../../cloudfunctions/_shared/date.js'

describe('date', () => {
  describe('formatDateTime', () => {
    it('格式化 Date 对象为北京时间', () => {
      // 2026-04-21T00:00:00.000Z UTC = 2026-04-21 08:00:00 北京时间
      const result = formatDateTime(new Date('2026-04-21T00:00:00.000Z'))
      expect(result).toBe('2026-04-21 08:00:00')
    })

    it('接受字符串输入', () => {
      const result = formatDateTime('2026-04-21T00:00:00.000Z')
      expect(result).toBe('2026-04-21 08:00:00')
    })

    it('格式化为 YYYY-MM-DD HH:mm:ss', () => {
      const result = formatDateTime(new Date('2026-01-15T12:30:45.000Z'))
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })
  })

  describe('getTodayDate', () => {
    it('返回 YYYY-MM-DD 格式', () => {
      const result = getTodayDate()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('返回北京时间的日期', () => {
      const result = getTodayDate()
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      const parts = formatter.formatToParts(now)
      const get = (type) => parts.find(p => p.type === type)?.value || ''
      const expected = `${get('year')}-${get('month')}-${get('day')}`
      expect(result).toBe(expected)
    })
  })

  describe('getDaysAgoDate', () => {
    it('返回 30 天前的日期', () => {
      const result = getDaysAgoDate(30)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('0 天返回今天', () => {
      expect(getDaysAgoDate(0)).toBe(getTodayDate())
    })
  })
})
