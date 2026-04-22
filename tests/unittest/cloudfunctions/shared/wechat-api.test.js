// tests/unittest/cloudfunctions/shared/wechat-api.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------- Mock infrastructure ----------
// We use require.cache injection because vi.mock cannot intercept
// CJS require() calls inside deps.inline modules in Vitest 4.x.

const mockDocChain = { get: vi.fn(), set: vi.fn() }

const dbPath = require.resolve(`${process.cwd()}/cloudfunctions/_shared/db.js`)
const datePath = require.resolve(`${process.cwd()}/cloudfunctions/_shared/date.js`)
const wechatPath = require.resolve(`${process.cwd()}/cloudfunctions/_shared/wechat-api.js`)

function injectMocks() {
  delete require.cache[dbPath]
  delete require.cache[datePath]

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      collection: () => ({ doc: () => mockDocChain }),
      getApp: vi.fn()
    }
  }

  require.cache[datePath] = {
    id: datePath,
    filename: datePath,
    loaded: true,
    exports: {
      formatDateTime: vi.fn(() => '2026-05-01 00:00:00')
    }
  }
}

function clearWechatCache() {
  delete require.cache[wechatPath]
}

// Helper: build a future datetime string like "2026-05-01 12:00:00"
function futureDateTimeStr(msAhead = 3600000) {
  const d = new Date(Date.now() + msAhead)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

describe('wechat-api', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    process.env.WX_APPID = 'test_appid'
    process.env.WX_APPSECRET = 'test_secret'
    vi.clearAllMocks()
    injectMocks()
    clearWechatCache()
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete process.env.WX_APPID
    delete process.env.WX_APPSECRET
  })

  // ---------- getAccessToken ----------
  describe('getAccessToken', () => {
    it('缓存命中（未过期）→ 直接返回缓存的 token', async () => {
      mockDocChain.get.mockResolvedValueOnce({
        data: { token: 'cached_token_123', expire_at: futureDateTimeStr(3600000) }
      })

      const { getAccessToken } = require(wechatPath)
      const token = await getAccessToken()
      expect(token).toBe('cached_token_123')
    })

    it('缓存过期 → 调用微信 API，缓存新 token 并返回', async () => {
      mockDocChain.get.mockResolvedValueOnce({
        data: { token: 'old_token', expire_at: '2020-01-01 00:00:00' }
      })

      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ access_token: 'new_token_456', expires_in: 7200 })
        })
      )

      mockDocChain.set.mockResolvedValueOnce(undefined)

      const { getAccessToken } = require(wechatPath)
      const token = await getAccessToken()
      expect(token).toBe('new_token_456')
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.weixin.qq.com/cgi-bin/token')
      )
      expect(mockDocChain.set).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'new_token_456' })
      )
    })

    it('微信 API 返回错误（errcode）→ 抛出异常', async () => {
      mockDocChain.get.mockResolvedValueOnce({ data: null })

      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ errcode: 40013, errmsg: 'invalid appid' })
        })
      )

      const { getAccessToken } = require(wechatPath)
      await expect(getAccessToken()).rejects.toThrow('获取 access_token 失败')
    })

    it('WX_APPID/WX_APPSECRET 环境变量缺失 → 抛出异常', async () => {
      delete process.env.WX_APPID
      delete process.env.WX_APPSECRET

      mockDocChain.get.mockResolvedValueOnce({ data: null })

      const { getAccessToken } = require(wechatPath)
      await expect(getAccessToken()).rejects.toThrow('WX_APPID')
    })
  })

  // ---------- sendSubscribeMessage ----------
  describe('sendSubscribeMessage', () => {
    it('发送成功（errcode: 0）→ 返回微信响应', async () => {
      mockDocChain.get.mockResolvedValueOnce({
        data: { token: 'test_token', expire_at: futureDateTimeStr() }
      })

      const wxResponse = { errcode: 0, errmsg: 'ok' }
      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(wxResponse)
        })
      )

      const { sendSubscribeMessage } = require(wechatPath)
      const result = await sendSubscribeMessage('openid_1', 'tpl_123', { thing1: { value: 'test' } }, 'pages/index')
      expect(result).toEqual(wxResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('发送失败（errcode: 40003）→ 抛出异常', async () => {
      mockDocChain.get.mockResolvedValueOnce({
        data: { token: 'test_token', expire_at: futureDateTimeStr() }
      })

      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ errcode: 40003, errmsg: 'invalid openid' })
        })
      )

      const { sendSubscribeMessage } = require(wechatPath)
      await expect(
        sendSubscribeMessage('bad_openid', 'tpl_123', {}, 'pages/index')
      ).rejects.toThrow('发送订阅消息失败')
    })
  })

  // ---------- getMiniProgramCode ----------
  describe('getMiniProgramCode', () => {
    it('返回图片（content-type: image/jpeg）→ 返回 { success: true, buffer, contentType }', async () => {
      mockDocChain.get.mockResolvedValueOnce({
        data: { token: 'test_token', expire_at: futureDateTimeStr() }
      })

      const fakeBuffer = new Uint8Array([137, 80, 78, 71]).buffer
      global.fetch = vi.fn(() =>
        Promise.resolve({
          headers: { get: (name) => name === 'content-type' ? 'image/jpeg' : '' },
          arrayBuffer: () => Promise.resolve(fakeBuffer)
        })
      )

      const { getMiniProgramCode } = require(wechatPath)
      const result = await getMiniProgramCode('case_123', 'pages/case/detail')
      expect(result.success).toBe(true)
      expect(result.contentType).toBe('image/jpeg')
      expect(result.buffer).toBeInstanceOf(Buffer)
    })

    it('返回 JSON 错误 → 返回 { success: false, error }', async () => {
      mockDocChain.get.mockResolvedValueOnce({
        data: { token: 'test_token', expire_at: futureDateTimeStr() }
      })

      const errJson = { errcode: 45009, errmsg: 'reach max api daily quota' }
      global.fetch = vi.fn(() =>
        Promise.resolve({
          headers: { get: (name) => name === 'content-type' ? 'application/json' : '' },
          json: () => Promise.resolve(errJson)
        })
      )

      const { getMiniProgramCode } = require(wechatPath)
      const result = await getMiniProgramCode('case_123', 'pages/case/detail')
      expect(result.success).toBe(false)
      expect(result.error).toEqual(errJson)
    })
  })
})
