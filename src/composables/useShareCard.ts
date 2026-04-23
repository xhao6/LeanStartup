import { ref } from 'vue'

/** Share card config from DESIGN.md */
export function getShareCardConfig() {
  return {
    width: 750,
    height: 1334,
    backgroundColor: '#1A1A2E',
    gradientMid: '#252538',
    brandTagColor: '#E94560',
    goldColor: '#F5A623',
    titleColor: '#FFFFFF',
    summaryColor: 'rgba(255,255,255,0.6)',
    brandText: '精益副业案例库'
  }
}

export interface ShareCardData {
  title: string
  summary: string
  scoreTotal: number
}

/** Simple text wrapping helper - splits text into lines with max chars per line */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = []
  for (let i = 0; i < text.length; i += maxCharsPerLine) {
    lines.push(text.slice(i, i + maxCharsPerLine))
    if (lines.length >= 3) break // max 3 lines
  }
  return lines
}

export function useShareCard() {
  const isGenerating = ref(false)
  const cardImageUrl = ref<string | null>(null)

  /** Draw the share card onto a UniApp canvas context */
  const drawCard = (
    ctx: any,
    data: ShareCardData,
    canvasId: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const config = getShareCardConfig()
      const { width, height } = config

      // Background
      ctx.setFillStyle(config.backgroundColor)
      ctx.fillRect(0, 0, width, height)

      // Brand tag at top
      ctx.setFillStyle(config.brandTagColor)
      ctx.fillRect(60, 80, 260, 48)
      ctx.setFontSize(24)
      ctx.setFillStyle('#FFFFFF')
      ctx.fillText(config.brandText, 80, 112)

      // Title (with word-wrap, max 16 chars per line, up to 3 lines)
      ctx.setFontSize(44)
      ctx.setFillStyle(config.titleColor)
      const titleLines = wrapText(data.title, 16)
      titleLines.forEach((line, i) => {
        ctx.fillText(line, 60, 240 + i * 60)
      })

      // Summary (truncate to 40 chars)
      const summaryY = 240 + titleLines.length * 60 + 40
      ctx.setFontSize(28)
      ctx.setFillStyle(config.summaryColor)
      const summaryText = data.summary.length > 40
        ? data.summary.slice(0, 40) + '...'
        : data.summary
      ctx.fillText(summaryText, 60, summaryY)

      // AI Score (gold, large)
      const scoreY = height - 280
      ctx.setFontSize(72)
      ctx.setFillStyle(config.goldColor)
      ctx.fillText(String(data.scoreTotal), 60, scoreY)
      ctx.setFontSize(24)
      ctx.setFillStyle(config.summaryColor)
      ctx.fillText('AI评分', 60, scoreY + 40)

      // QR code placeholder
      ctx.setStrokeStyle('rgba(255,255,255,0.2)')
      ctx.strokeRect(width - 200, height - 260, 140, 140)
      ctx.setFontSize(20)
      ctx.setFillStyle('rgba(255,255,255,0.3)')
      ctx.fillText('小程序码', width - 188, height - 180)

      // Draw and export
      ctx.draw(false, () => {
        setTimeout(() => {
          uni.canvasToTempFilePath({
            canvasId,
            success: (res: any) => {
              cardImageUrl.value = res.tempFilePath
              resolve(res.tempFilePath)
            },
            fail: (err: any) => reject(err)
          })
        }, 300)
      })
    })
  }

  /** Save image to device photo album */
  const saveToAlbum = async (filePath: string): Promise<boolean> => {
    try {
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => resolve(),
          fail: (err: any) => reject(err)
        })
      })
      uni.showToast({ title: '已保存到相册', icon: 'success' })
      return true
    } catch {
      uni.showToast({ title: '保存失败', icon: 'none' })
      return false
    }
  }

  return { isGenerating, cardImageUrl, drawCard, saveToAlbum, getShareCardConfig }
}
