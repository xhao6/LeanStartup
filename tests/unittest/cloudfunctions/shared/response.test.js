// tests/unittest/cloudfunctions/shared/response.test.js
import { describe, it, expect } from 'vitest'
import { success, error } from '../../../../cloudfunctions/_shared/response.js'

describe('response', () => {
  describe('success', () => {
    it('返回正确格式带数据', () => {
      const result = success({ id: 1 })
      expect(result).toEqual({ success: true, data: { id: 1 } })
    })

    it('返回正确格式带 null', () => {
      const result = success(null)
      expect(result).toEqual({ success: true, data: null })
    })

    it('返回正确格式带数组', () => {
      const result = success([1, 2, 3])
      expect(result).toEqual({ success: true, data: [1, 2, 3] })
    })
  })

  describe('error', () => {
    it('返回正确格式带 code', () => {
      const result = error('出错了', 'NOT_FOUND')
      expect(result).toEqual({ success: false, error: '出错了', code: 'NOT_FOUND' })
    })

    it('无 code 时默认 UNKNOWN', () => {
      const result = error('出错了')
      expect(result.code).toBe('UNKNOWN')
    })
  })
})
