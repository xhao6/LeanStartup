import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock wx and uni
vi.stubGlobal('wx', {
  cloud: { callFunction: vi.fn() },
  requestSubscribeMessage: vi.fn()
})
vi.stubGlobal('uni', {
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showModal: vi.fn(),
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(() => null)
})

import { formatDate } from '@/pages/subscription/helpers'

describe('subscription helpers', () => {
  it('formatDate returns "今天" for today', () => {
    const today = new Date().toISOString()
    expect(formatDate(today)).toBe('今天')
  })

  it('formatDate returns "昨天" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(formatDate(yesterday)).toBe('昨天')
  })

  it('formatDate returns "N 天前" for recent dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(formatDate(threeDaysAgo)).toBe('3 天前')
  })

  it('formatDate returns "M月D日" for dates > 7 days', () => {
    const date = new Date(Date.now() - 15 * 86400000)
    const expected = `${date.getMonth() + 1}月${date.getDate()}日`
    expect(formatDate(date.toISOString())).toBe(expected)
  })
})
