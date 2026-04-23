import { describe, it, expect, vi } from 'vitest'

// Mock uni before importing
vi.stubGlobal('uni', {
  canvasToTempFilePath: vi.fn(({ success }) => success({ tempFilePath: '/tmp/card.png' })),
  saveImageToPhotosAlbum: vi.fn(({ success }) => success()),
  showToast: vi.fn(),
  createCanvasContext: vi.fn(() => ({
    setFillStyle: vi.fn(),
    fillRect: vi.fn(),
    setFontSize: vi.fn(),
    setFontStyle: vi.fn(),
    fillText: vi.fn(),
    draw: vi.fn((reserve, callback) => callback && callback()),
    setGlobalAlpha: vi.fn(),
    setStrokeStyle: vi.fn(),
    strokeRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    stroke: vi.fn(),
    beginPath: vi.fn()
  }))
})

import { getShareCardConfig, useShareCard } from '@/composables/useShareCard'

describe('useShareCard', () => {
  describe('getShareCardConfig', () => {
    it('returns correct dimensions (9:16 ratio)', () => {
      const config = getShareCardConfig()
      expect(config.width).toBe(750)
      expect(config.height).toBe(1334)
    })

    it('has deep gradient background color', () => {
      const config = getShareCardConfig()
      expect(config.backgroundColor).toBe('#1A1A2E')
      expect(config.gradientMid).toBe('#252538')
    })

    it('has correct brand tag color', () => {
      const config = getShareCardConfig()
      expect(config.brandTagColor).toBe('#E94560')
      expect(config.brandText).toBe('精益副业案例库')
    })

    it('has correct gold color for AI score', () => {
      const config = getShareCardConfig()
      expect(config.goldColor).toBe('#F5A623')
    })

    it('has correct text colors', () => {
      const config = getShareCardConfig()
      expect(config.titleColor).toBe('#FFFFFF')
      expect(config.summaryColor).toBe('rgba(255,255,255,0.6)')
    })
  })

  describe('useShareCard composable', () => {
    it('has correct initial state', () => {
      const { isGenerating, cardImageUrl } = useShareCard()
      expect(isGenerating.value).toBe(false)
      expect(cardImageUrl.value).toBeNull()
    })

    it('drawCard returns a promise that resolves with tempFilePath', async () => {
      const { drawCard } = useShareCard()
      const mockCtx = uni.createCanvasContext('shareCard')

      const result = await drawCard(mockCtx, {
        title: '测试案例标题',
        summary: '这是一个测试案例摘要内容',
        scoreTotal: 92
      }, 'shareCard')

      expect(result).toBe('/tmp/card.png')
    })

    it('drawCard draws brand tag with correct color', async () => {
      const { drawCard } = useShareCard()
      const mockCtx = uni.createCanvasContext('shareCard')

      await drawCard(mockCtx, {
        title: '标题',
        summary: '摘要',
        scoreTotal: 85
      }, 'shareCard')

      // Verify setFillStyle was called with brand tag color
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#E94560')
    })

    it('drawCard draws score with gold color', async () => {
      const { drawCard } = useShareCard()
      const mockCtx = uni.createCanvasContext('shareCard')

      await drawCard(mockCtx, {
        title: '标题',
        summary: '摘要',
        scoreTotal: 92
      }, 'shareCard')

      // Verify setFillStyle was called with gold color for score
      expect(mockCtx.setFillStyle).toHaveBeenCalledWith('#F5A623')
    })

    it('drawCard truncates long summary', async () => {
      const { drawCard } = useShareCard()
      const mockCtx = uni.createCanvasContext('shareCard')

      // 50 chars - exceeds the 40-char limit
      const longSummary = '这是一段非常非常非常长的摘要内容已经远远远远超过了四十个字符的限制所以会被截断处理掉的'
      await drawCard(mockCtx, {
        title: '标题',
        summary: longSummary,
        scoreTotal: 88
      }, 'shareCard')

      // fillText should be called with truncated text (40 chars + '...')
      const fillTextCalls = mockCtx.fillText.mock.calls
      const summaryCall = fillTextCalls.find((call: string[]) =>
        typeof call[0] === 'string' && call[0].endsWith('...')
      )
      expect(summaryCall).toBeTruthy()
      expect(summaryCall[0].length).toBeLessThanOrEqual(43) // 40 + '...'
    })

    it('drawCard wraps long title into multiple lines', async () => {
      const { drawCard } = useShareCard()
      const mockCtx = uni.createCanvasContext('shareCard')

      const longTitle = '这是一个非常长的标题需要被自动换行处理才能完整显示'
      await drawCard(mockCtx, {
        title: longTitle,
        summary: '摘要',
        scoreTotal: 80
      }, 'shareCard')

      // Title should be split into multiple fillText calls
      const fillTextCalls = mockCtx.fillText.mock.calls
      const titleCalls = fillTextCalls.filter((call: string[]) => {
        const text = call[0]
        return typeof text === 'string' && longTitle.includes(text)
      })
      expect(titleCalls.length).toBeGreaterThan(1)
    })

    it('saveToAlbum calls uni.saveImageToPhotosAlbum', async () => {
      const { saveToAlbum } = useShareCard()
      const result = await saveToAlbum('/tmp/card.png')
      expect(result).toBe(true)
      expect(uni.saveImageToPhotosAlbum).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: '/tmp/card.png' })
      )
    })

    it('saveToAlbum returns false on failure', async () => {
      vi.mocked(uni.saveImageToPhotosAlbum).mockImplementationOnce(({ fail }) =>
        fail && fail(new Error('denied'))
      )
      const { saveToAlbum } = useShareCard()
      const result = await saveToAlbum('/tmp/card.png')
      expect(result).toBe(false)
    })
  })
})
