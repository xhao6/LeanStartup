import { describe, it, expect } from 'vitest'
import { formatDate, formatDateShort, formatMoney, getScoreGrade, getScoreGradeColor, calculatePercentage, getCurrentDate, isToday, truncateText, getRelativeTime } from '@/utils/format'

describe('formatDate', () => {
  it('formats Date to YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 3, 23))).toBe('2026-04-23')
  })
  it('formats string date', () => {
    expect(formatDate('2026-04-23')).toBe('2026-04-23')
  })
  it('pads single digit months and days', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatDateShort', () => {
  it('formats to MM-DD', () => {
    expect(formatDateShort('2026-04-23')).toBe('04-23')
  })
})

describe('formatMoney', () => {
  it('returns number as string', () => {
    expect(formatMoney(500)).toBe('500')
  })
  it('formats 10000+ as 万', () => {
    expect(formatMoney(15000)).toBe('1.5万')
  })
  it('handles string input', () => {
    expect(formatMoney('3000')).toBe('3000')
  })
  it('handles NaN', () => {
    expect(formatMoney('abc')).toBe('0')
  })
})

describe('getScoreGrade', () => {
  it('returns S for >= 90', () => { expect(getScoreGrade(95)).toBe('S') })
  it('returns A for >= 80', () => { expect(getScoreGrade(85)).toBe('A') })
  it('returns B for >= 70', () => { expect(getScoreGrade(75)).toBe('B') })
  it('returns C for >= 60', () => { expect(getScoreGrade(65)).toBe('C') })
  it('returns D for < 60', () => { expect(getScoreGrade(50)).toBe('D') })
})

describe('getScoreGradeColor', () => {
  it('returns green for S grade', () => { expect(getScoreGradeColor(95)).toBe('#059669') })
  it('returns gold for A grade', () => { expect(getScoreGradeColor(85)).toBe('#F5A623') })
  it('returns gray for D grade', () => { expect(getScoreGradeColor(50)).toBe('#9B9A97') })
})

describe('calculatePercentage', () => {
  it('calculates percentage', () => { expect(calculatePercentage(17, 20)).toBe('85%') })
  it('handles zero max', () => { expect(calculatePercentage(5, 0)).toBe('0%') })
})

describe('truncateText', () => {
  it('returns text if within limit', () => { expect(truncateText('hello', 10)).toBe('hello') })
  it('truncates and adds ...', () => { expect(truncateText('hello world', 5)).toBe('hello...') })
})

describe('isToday', () => {
  it('returns true for today', () => { expect(isToday(new Date())).toBe(true) })
  it('returns false for other dates', () => { expect(isToday('2020-01-01')).toBe(false) })
})
