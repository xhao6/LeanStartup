// tests/unittest/cloudfunctions/shared/auth.test.js
import { describe, it, expect } from 'vitest'
import { getOpenid, assertCloudFunctionContext, validateCaseId, validateProgress, validateEventName } from '../../../../cloudfunctions/_shared/auth.js'
import { createMockContext, createUnauthContext } from '../helpers/mock-context.js'

describe('auth', () => {
  describe('getOpenid', () => {
    it('从 wxContext 获取 OPENID', () => {
      const ctx = createMockContext('openid_abc')
      expect(getOpenid(ctx)).toBe('openid_abc')
    })

    it('无 OPENID 时抛出异常', () => {
      expect(() => getOpenid(createUnauthContext())).toThrow('UNAUTHORIZED')
    })

    it('null context 时抛出异常', () => {
      expect(() => getOpenid(null)).toThrow('UNAUTHORIZED')
    })
  })

  describe('assertCloudFunctionContext', () => {
    it('有效上下文不抛异常', () => {
      expect(() => assertCloudFunctionContext(createMockContext())).not.toThrow()
    })

    it('无效上下文抛出异常', () => {
      expect(() => assertCloudFunctionContext(createUnauthContext())).toThrow('FORBIDDEN')
    })

    it('null 上下文抛出异常', () => {
      expect(() => assertCloudFunctionContext(null)).toThrow('FORBIDDEN')
    })
  })

  describe('validateCaseId', () => {
    it('合法数字字符串通过', () => {
      expect(validateCaseId('100001')).toBe(true)
    })

    it('空字符串拒绝', () => {
      expect(() => validateCaseId('')).toThrow('INVALID_INPUT')
    })

    it('非数字字符串拒绝', () => {
      expect(() => validateCaseId('abc')).toThrow('INVALID_INPUT')
    })

    it('非字符串拒绝', () => {
      expect(() => validateCaseId(123)).toThrow('INVALID_INPUT')
    })

    it('null 拒绝', () => {
      expect(() => validateCaseId(null)).toThrow('INVALID_INPUT')
    })
  })

  describe('validateProgress', () => {
    it('合法 progress 通过', () => {
      expect(validateProgress({ step_1: true, step_2: false })).toBe(true)
    })

    it('null 通过（可选字段）', () => {
      expect(validateProgress(null)).toBe(true)
    })

    it('undefined 通过（可选字段）', () => {
      expect(validateProgress(undefined)).toBe(true)
    })

    it('非法 key 拒绝', () => {
      expect(() => validateProgress({ invalid_key: true })).toThrow('INVALID_INPUT')
    })

    it('非布尔值拒绝', () => {
      expect(() => validateProgress({ step_1: 'yes' })).toThrow('INVALID_INPUT')
    })

    it('数组拒绝', () => {
      expect(() => validateProgress([true, false])).toThrow('INVALID_INPUT')
    })
  })

  describe('validateEventName', () => {
    it('合法事件名通过', () => {
      expect(validateEventName('page_view')).toBe(true)
    })

    it('subscribe 事件名通过', () => {
      expect(validateEventName('subscribe')).toBe(true)
    })

    it('非法事件名拒绝', () => {
      expect(() => validateEventName('hack')).toThrow('INVALID_INPUT')
    })

    it('空字符串拒绝', () => {
      expect(() => validateEventName('')).toThrow('INVALID_INPUT')
    })
  })
})
