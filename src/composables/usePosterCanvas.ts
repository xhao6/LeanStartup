// @ts-nocheck
import { ref } from 'vue'

const CANVAS_W = 750
const CANVAS_H = 1000

const COLOR = {
  bg: '#F8F6F1',
  card: '#FFFFFF',
  title: '#1C1917',
  body: '#78716C',
  accent: '#E11D48',
  gold: '#CA8A04',
  border: '#E7E5E4',
  tagBg: '#F0EDE8',
  white: '#FFFFFF',
} as const

interface RenderCase {
  id: string
  title: string
  summary: string
  score_total: number
  cost: string
  source_account: string
  tags: string[]
  suitable_for: string
  cycle: string
  source_url: string
  story: string
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  expected_revenue: string
  steps: string[]
  tools: Array<{ name: string; desc: string }>
  pitfalls: string
  risk_tags: string[]
  image: string
}

interface PosterResult {
  success: boolean
  paths: string[]
  error?: string
}

type ProgressCallback = (done: number, total: number) => void

function toRenderCase(c: any): RenderCase {
  return {
    id: c.id || '',
    title: c.title || '',
    summary: c.summary || '',
    score_total: c.score_total || 0,
    cost: c.cost || '',
    source_account: c.source_account || '',
    tags: c.tags || [],
    suitable_for: c.suitable_for || '',
    cycle: c.cycle || '',
    source_url: c.source_url || '',
    story: c.story || '',
    score_feasibility: c.score_feasibility || 0,
    score_profit: c.score_profit || 0,
    score_timeliness: c.score_timeliness || 0,
    score_detail: c.score_detail || 0,
    score_fitness: c.score_fitness || 0,
    expected_revenue: c.expected_revenue || '',
    steps: (c.steps || []).map((s: any) => (typeof s === 'string' ? s : s.step || '')),
    tools: c.tools || [],
    pitfalls: c.pitfalls || '',
    risk_tags: c.risk_tags || [],
    image: c.image || '',
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = color
  ctx.fill()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}

function splitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines?: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const char of text) {
    if (ctx.measureText(current + char).width > maxWidth) {
      if (current) lines.push(current)
      current = char
    } else {
      current += char
    }
    if (maxLines && lines.length >= maxLines) {
      if (current) lines[lines.length - 1] = truncateText(ctx, lines[lines.length - 1], maxWidth)
      return lines
    }
  }
  if (current) lines.push(current)
  return lines
}

function exportCanvas(canvas: OffscreenCanvas): Promise<string> {
  return new Promise((resolve, reject) => {
    const systemInfo = wx.getSystemInfoSync()
    const dpr = systemInfo.pixelRatio || 2
    wx.canvasToTempFilePath({
      canvas,
      destWidth: CANVAS_W * dpr,
      destHeight: CANVAS_H * dpr,
      success: (res: any) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

function getRankColors(index: number) {
  const ranks = [
    { start: '#CA8A04', end: '#E5A812' },
    { start: '#94A3B8', end: '#64748B' },
    { start: '#C4956A', end: '#A67B5B' },
  ]
  return ranks[index] || ranks[2]
}

async function drawRankingTop3(ctx: CanvasRenderingContext2D, cases: RenderCase[], dateStr: string) {
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.font = 'bold 28px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.title
  ctx.textAlign = 'center'
  ctx.fillText('搞钱案例榜', CANVAS_W / 2, 48)

  ctx.font = '15px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText(dateStr.replace(/-/g, '.'), CANVAS_W / 2, 82)

  const cardY = 128, cardH = 140, gap = 14
  for (let i = 0; i < 3 && i < cases.length; i++) {
    const y = cardY + i * (cardH + gap)
    const c = cases[i]
    const rank = getRankColors(i)

    fillRoundRect(ctx, 28, y, CANVAS_W - 56, cardH, 14, COLOR.card)
    ctx.strokeStyle = COLOR.border
    ctx.lineWidth = 1
    roundRect(ctx, 28, y, CANVAS_W - 56, cardH, 14)
    ctx.stroke()

    const badgeX = 52, badgeY = y + 24, badgeR = 22
    const gradient = ctx.createLinearGradient(badgeX - badgeR, badgeY - badgeR, badgeX + badgeR, badgeY + badgeR)
    gradient.addColorStop(0, rank.start)
    gradient.addColorStop(1, rank.end)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = 'bold 20px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.white
    ctx.textAlign = 'center'
    ctx.fillText(`${i + 1}`, badgeX, badgeY + 7)

    ctx.textAlign = 'left'
    ctx.font = 'bold 17px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.title
    ctx.fillText(truncateText(ctx, c.title, 420), 90, y + 24)

    const scoreText = `★ ${c.score_total.toFixed(1)}`
    ctx.font = '14px "PingFang SC", sans-serif'
    const scoreW = ctx.measureText(scoreText).width + 20
    fillRoundRect(ctx, CANVAS_W - 56 - scoreW, y + 18, scoreW, 26, 13, '#CA8A04')
    ctx.fillStyle = COLOR.white
    ctx.textAlign = 'center'
    ctx.fillText(scoreText, CANVAS_W - 56 - scoreW + scoreW / 2, y + 24)

    ctx.textAlign = 'left'
    ctx.font = '14px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.body
    ctx.fillText(truncateText(ctx, c.summary, 540), 90, y + 54)

    let tagX = 90, tagY2 = y + 82
    for (const tag of (c.tags || []).slice(0, 3)) {
      const tagW = ctx.measureText(tag).width + 16
      if (tagX + tagW > CANVAS_W - 28) break
      fillRoundRect(ctx, tagX, tagY2, tagW, 24, 12, COLOR.tagBg)
      ctx.fillStyle = COLOR.body
      ctx.font = '12px "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(tag, tagX + tagW / 2, tagY2 + 7)
      tagX += tagW + 10
    }
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.border
  ctx.fillRect(320, CANVAS_H - 80, 110, 1)
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('📱 精益副业案例库', CANVAS_W / 2, CANVAS_H - 65)
}

async function drawCaseDetail(ctx: CanvasRenderingContext2D, c: RenderCase) {
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  let tagX = 32, tagY = 28
  ctx.textAlign = 'left'
  for (const tag of (c.tags || []).slice(0, 4)) {
    const tw = ctx.measureText(tag).width + 16
    fillRoundRect(ctx, tagX, tagY, tw, 24, 12, COLOR.tagBg)
    ctx.fillStyle = COLOR.body
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(tag, tagX + tw / 2, tagY + 7)
    tagX += tw + 8
  }

  let y = 64
  ctx.textAlign = 'left'
  ctx.font = 'bold 22px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.title
  const titleLines = splitText(ctx, c.title, 686, 2)
  for (const line of titleLines) {
    ctx.fillText(line, 32, y)
    y += 32
  }

  ctx.font = '15px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText(truncateText(ctx, c.summary, 686), 32, y + 4)
  y += 34

  const colGap = 14
  const cardW = (CANVAS_W - 64 - colGap) / 2
  const cardY1 = y + 6
  const scoreH = 128

  fillRoundRect(ctx, 32, cardY1, cardW, scoreH, 12, COLOR.card)
  ctx.strokeStyle = COLOR.border
  ctx.lineWidth = 1
  roundRect(ctx, 32, cardY1, cardW, scoreH, 12)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.font = 'bold 36px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.gold
  ctx.fillText(`★ ${c.score_total.toFixed(1)}`, 32 + cardW / 2, cardY1 + 12)
  ctx.font = '11px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('AI 综合评分', 32 + cardW / 2, cardY1 + 54)

  const dims = [
    { label: '可行性', val: c.score_feasibility },
    { label: '盈利性', val: c.score_profit },
    { label: '时效性', val: c.score_timeliness },
    { label: '详细度', val: c.score_detail },
    { label: '适合度', val: c.score_fitness },
  ]
  const barY = cardY1 + 68
  ctx.textAlign = 'left'
  ctx.font = '10px "PingFang SC", sans-serif'
  for (let i = 0; i < dims.length; i++) {
    const by = barY + i * 12
    ctx.fillStyle = COLOR.body
    ctx.fillText(dims[i].label, 40, by)
    const pct = Math.min(dims[i].val / 10, 1)
    const barW2 = cardW - 80
    ctx.fillStyle = COLOR.border
    ctx.fillRect(96, by + 3, barW2, 5)
    ctx.fillStyle = COLOR.gold
    ctx.fillRect(96, by + 3, barW2 * pct, 5)
  }

  const infoX = 32 + cardW + colGap
  fillRoundRect(ctx, infoX, cardY1, cardW, scoreH, 12, COLOR.card)
  ctx.strokeStyle = COLOR.border
  ctx.lineWidth = 1
  roundRect(ctx, infoX, cardY1, cardW, scoreH, 12)
  ctx.stroke()

  const infoItems = [
    { label: '成本', value: c.cost },
    { label: '周期', value: c.cycle },
    { label: '预期收益', value: c.expected_revenue },
    { label: '适合', value: c.suitable_for },
  ]
  for (let i = 0; i < infoItems.length; i++) {
    const iy = cardY1 + 10 + Math.floor(i / 2) * 55
    const ix = infoX + 12 + (i % 2) * (cardW / 2)
    ctx.fillStyle = COLOR.body
    ctx.font = '11px "PingFang SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(infoItems[i].label, ix, iy)
    ctx.fillStyle = COLOR.title
    ctx.font = '13px "PingFang SC", sans-serif'
    ctx.fillText(truncateText(ctx, infoItems[i].value, cardW / 2 - 16), ix, iy + 18)
  }

  y = cardY1 + scoreH + 10

  if (c.story) {
    fillRoundRect(ctx, 32, y, CANVAS_W - 64, 100, 12, COLOR.card)
    ctx.fillStyle = COLOR.title
    ctx.font = 'bold 14px "PingFang SC", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('案例故事', 46, y + 16)
    ctx.font = '13px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.body
    ctx.fillText(truncateText(ctx, c.story.replace(/\n/g, ' '), CANVAS_W - 100), 46, y + 42)
    y += 110
  } else {
    y += 4
  }

  const stepsH = 110
  const halfW = (CANVAS_W - 64 - colGap) / 2

  fillRoundRect(ctx, 32, y, halfW, stepsH, 12, COLOR.card)
  ctx.strokeStyle = COLOR.border
  ctx.lineWidth = 1
  roundRect(ctx, 32, y, halfW, stepsH, 12)
  ctx.stroke()
  ctx.fillStyle = COLOR.title
  ctx.font = 'bold 13px "PingFang SC", sans-serif'
  ctx.fillText('实践步骤', 46, y + 16)

  if (c.steps && c.steps.length > 0) {
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.body
    const stepLines = splitText(ctx, c.steps.slice(0, 3).map((s, idx) => `${idx + 1}. ${s}`).join('  '), halfW - 28, 7)
    for (let i = 0; i < stepLines.length; i++) {
      ctx.fillText(stepLines[i], 46, y + 40 + i * 18)
    }
  }

  if (c.pitfalls) {
    const pitX = 32 + halfW + colGap
    fillRoundRect(ctx, pitX, y, halfW, stepsH, 12, COLOR.card)
    ctx.strokeStyle = COLOR.border
    ctx.lineWidth = 1
    roundRect(ctx, pitX, y, halfW, stepsH, 12)
    ctx.stroke()
    ctx.fillStyle = COLOR.title
    ctx.font = 'bold 13px "PingFang SC", sans-serif'
    ctx.fillText('避坑指南', pitX + 14, y + 16)
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.body
    ctx.fillText(truncateText(ctx, c.pitfalls.replace(/\n/g, ' '), halfW - 28), pitX + 14, y + 42)
  }

  y += stepsH + 10

  if (c.risk_tags && c.risk_tags.length > 0) {
    let rtX = 32
    ctx.textAlign = 'left'
    for (const tag of c.risk_tags.slice(0, 4)) {
      const tw = ctx.measureText(`🔖 ${tag}`).width + 16
      fillRoundRect(ctx, rtX, y, tw, 24, 12, COLOR.tagBg)
      ctx.fillStyle = COLOR.body
      ctx.font = '12px "PingFang SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🔖 ${tag}`, rtX + tw / 2, y + 7)
      rtX += tw + 8
    }
    y += 34
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.border
  ctx.fillRect(320, CANVAS_H - 80, 110, 1)
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('📱 精益副业案例库', CANVAS_W / 2, CANVAS_H - 65)
}

async function drawRecentDays(ctx: CanvasRenderingContext2D, days: Array<{ date: string; cases: RenderCase[] }>) {
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.font = 'bold 24px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.title
  ctx.textAlign = 'center'
  ctx.fillText('近三日精选榜单', CANVAS_W / 2, 40)

  const cardY = 80, cardH = 254, gap = 14
  for (let di = 0; di < 3 && di < days.length; di++) {
    const y = cardY + di * (cardH + gap)
    const day = days[di]
    const dateLabel = day.date.replace(/-/g, '.')
    ctx.textAlign = 'left'
    ctx.font = 'bold 14px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.title
    ctx.fillText(`▸ ${dateLabel}`, 32, y)

    const listY = y + 28
    fillRoundRect(ctx, 32, listY, CANVAS_W - 64, 210, 12, COLOR.card)
    ctx.strokeStyle = COLOR.border
    ctx.lineWidth = 1
    roundRect(ctx, 32, listY, CANVAS_W - 64, 210, 12)
    ctx.stroke()

    for (let ci = 0; ci < 3 && ci < day.cases.length; ci++) {
      const c = day.cases[ci]
      const cy = listY + 14 + ci * 64
      const rank = getRankColors(ci)

      const badgeX = 56, badgeY = cy + 22, badgeR = 14
      const gradient = ctx.createLinearGradient(badgeX - badgeR, badgeY - badgeR, badgeX + badgeR, badgeY + badgeR)
      gradient.addColorStop(0, rank.start)
      gradient.addColorStop(1, rank.end)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
      ctx.fill()
      ctx.font = 'bold 13px "PingFang SC", sans-serif'
      ctx.fillStyle = COLOR.white
      ctx.textAlign = 'center'
      ctx.fillText(`${ci + 1}`, badgeX, badgeY + 5)

      ctx.textAlign = 'left'
      ctx.font = '15px "PingFang SC", sans-serif'
      ctx.fillStyle = COLOR.title
      ctx.fillText(truncateText(ctx, c.title, CANVAS_W - 180), 86, cy + 20)

      ctx.font = '14px "PingFang SC", sans-serif'
      ctx.fillStyle = COLOR.gold
      ctx.textAlign = 'right'
      ctx.fillText(`★ ${c.score_total.toFixed(1)}`, CANVAS_W - 50, cy + 20)

      if (ci < 2) {
        ctx.strokeStyle = COLOR.border
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(46, cy + 60)
        ctx.lineTo(CANVAS_W - 46, cy + 60)
        ctx.stroke()
      }
    }
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.border
  ctx.fillRect(320, CANVAS_H - 80, 110, 1)
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('📱 精益副业案例库', CANVAS_W / 2, CANVAS_H - 65)
}

function getBeijingDate(): string {
  const d = new Date()
  const beijing = new Date(d.getTime() + 8 * 3600000)
  const y = beijing.getUTCFullYear()
  const m = String(beijing.getUTCMonth() + 1).padStart(2, '0')
  const day = String(beijing.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function usePosterCanvas() {
  const progress = ref(0)
  const maxProgress = ref(5)
  const tempFilePaths = ref<string[]>([])
  const errors = ref<string[]>([])

  async function generateAll(
    todayCases: any[],
    caseDetails: any[],
    historyDays: Array<{ date: string; cases: any[] }>,
    onProgress: ProgressCallback
  ): Promise<PosterResult> {
    progress.value = 0
    tempFilePaths.value = []
    errors.value = []

    if (!todayCases || todayCases.length === 0) {
      return { success: false, paths: [], error: '今日暂无榜单数据' }
    }

    const rc = todayCases.map(toRenderCase)
    const rDetails = caseDetails.map(toRenderCase)
    const rHistory = historyDays.map(d => ({ date: d.date, cases: d.cases.map(toRenderCase) }))

    const dateStr = getBeijingDate()

    const canvasA = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
    const canvasB = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
    const canvasC = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })

    let done = 0
    const tick = () => {
      done++
      progress.value = done
      onProgress(done, maxProgress.value)
    }

    try {
      const results = await Promise.all([
        (async () => {
          const ctxA = canvasA.getContext('2d')
          ctxA.textBaseline = 'top'
          await drawRankingTop3(ctxA, rc, dateStr)
          const path1 = await exportCanvas(canvasA)
          tick()
          ctxA.clearRect(0, 0, CANVAS_W, CANVAS_H)
          ctxA.textBaseline = 'top'
          await drawRecentDays(ctxA, rHistory)
          const path5 = await exportCanvas(canvasA)
          tick()
          return [path1, path5]
        })(),
        (async () => {
          if (!rDetails[0]) return ['']
          const ctxB = canvasB.getContext('2d')
          ctxB.textBaseline = 'top'
          await drawCaseDetail(ctxB, rDetails[0])
          const path2 = await exportCanvas(canvasB)
          tick()
          return [path2]
        })(),
        (async () => {
          const results: string[] = []
          const ctxC = canvasC.getContext('2d')
          ctxC.textBaseline = 'top'
          if (rDetails[1]) {
            await drawCaseDetail(ctxC, rDetails[1])
            results.push(await exportCanvas(canvasC))
            tick()
          }
          if (rDetails[2]) {
            ctxC.clearRect(0, 0, CANVAS_W, CANVAS_H)
            ctxC.textBaseline = 'top'
            await drawCaseDetail(ctxC, rDetails[2])
            results.push(await exportCanvas(canvasC))
            tick()
          }
          return results
        })(),
      ])

      const allPaths = [...results[0], ...results[1], ...results[2]].filter(Boolean)
      tempFilePaths.value = allPaths
      return { success: allPaths.length >= 3, paths: allPaths }
    } catch (e: any) {
      const msg = e.message || '生成失败'
      errors.value.push(msg)
      console.error('[usePosterCanvas] 渲染失败:', e)
      return { success: false, paths: tempFilePaths.value, error: msg }
    }
  }

  return { progress, maxProgress, tempFilePaths, errors, generateAll }
}
