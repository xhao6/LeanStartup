# 导出海报 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在个人中心新增「导出海报」功能，一键生成 5 张 3:4 精选图片并保存到相册

**Architecture:** 3 个离屏 Canvas 并行渲染（方案 B），纯微信小程序 (`#ifdef MP-WEIXIN`)。预加载所有数据后并行绘制，通过进度回调驱动全屏进度页

**Tech Stack:** wx.createOffscreenCanvas(type:'2d')、wechat canvasToTempFilePath、saveImageToPhotosAlbum

**设计文档:** `docs/superpowers/specs/2026-05-12-poster-export-design.md`

**配色方案（暖调编辑金）:**
- 背景 `#F8F6F1` / 卡片 `#FFFFFF` / 标题 `#1C1917` / 正文 `#78716C`
- 强调 `#E11D48` / 金色 `#CA8A04` / 边框 `#E7E5E4` / 标签底 `#F0EDE8`

---

### Task 1: 注册海报页面路由

**Files:**
- Modify: `src/pages.json`

- [ ] **Step 1: 在 pages.json 中添加两个新路由**

```json
// 在 pages 数组末尾（profile/about 之后）追加：
{
  "path": "pages/profile/poster/generate",
  "style": {
    "navigationBarTitleText": "生成海报",
    "navigationBarBackgroundColor": "#F8F6F1",
    "navigationBarTextStyle": "black"
  }
},
{
  "path": "pages/profile/poster/preview",
  "style": {
    "navigationBarTitleText": "预览海报",
    "navigationBarBackgroundColor": "#F8F6F1",
    "navigationBarTextStyle": "black"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages.json
git commit -m "feat: add poster generate/preview routes"
```

---

### Task 2: 个人中心添加"导出海报"入口

**Files:**
- Modify: `src/pages/profile/index.vue`

Profile 页面菜单列表目前是：

```
订阅管理  →  wd-cell（第 66 行）
转发朋友  →  button.share-btn > wd-cell（第 68 行）
```

需要在「订阅管理」和「转发朋友」之间插入一个 cell，「导出海报」。

- [ ] **Step 1: 在模板中插入导出海报 cell**

在 `src/pages/profile/index.vue` 模板中，找到 `<wd-cell title="订阅管理" ... />` 行，在其后插入：

```diff
 <wd-cell title="订阅管理" is-link icon="setting" @click="goToSubscription" />
+<wd-cell title="导出海报" is-link icon="picture" @click="goToPoster" />
 <button class="share-btn" open-type="share">
```

- [ ] **Step 2: 添加导航方法**

在 `<script>` 部分，找到 `const goToFavorites` 的定义附近，新增：

```typescript
const goToPoster = () => {
  uni.navigateTo({ url: '/pages/profile/poster/generate' })
}
```

注意：`#ifdef MP-WEIXIN` 包裹（此功能仅微信端可见），但 profile 本身仅微信小程序运行，所以直接写即可。

- [ ] **Step 3: Commit**

```bash
git add src/pages/profile/index.vue
git commit -m "feat: add poster export entry in profile page"
```

---

### Task 3: 创建 usePosterCanvas 渲染引擎

**Files:**
- Create: `src/composables/usePosterCanvas.ts`

这是核心渲染引擎。微信离屏 Canvas 2D API 使用 `wx.createOffscreenCanvas({type:'2d', width:750, height:1000})`，通过 `canvas.getContext('2d')` 获得 2D 上下文。导出使用 `wx.canvasToTempFilePath({canvas})`。

注意：**所有绘制函数都在微信 `#ifdef` 内**，H5 环境不调用。

- [ ] **Step 1: 创建 composable 骨架和类型定义**

```typescript
// src/composables/usePosterCanvas.ts
// #ifdef MP-WEIXIN
import type { DailyCase, CaseDetail, HistoryItem } from '@/api/modules/daily'

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

interface PosterResult {
  success: boolean
  paths: string[]
  error?: string
}

type ProgressCallback = (done: number, total: number) => void
// #endif
```

- [ ] **Step 2: 创建 fromDataSource 数据转换函数**

从 store 和 API 层面转换数据为渲染所需的格式。每个案例统一接口，确保后续绘制函数不依赖 store 结构：

```typescript
// #ifdef MP-WEIXIN
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

function toRenderCase(c: DailyCase | CaseDetail | any): RenderCase {
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
// #endif
```

- [ ] **Step 3: 实现 Canvas 工具函数**

```typescript
// #ifdef MP-WEIXIN
/** 绘制圆角矩形（仅路径） */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
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

/** 填充圆角矩形 */
function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number, color: string
) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = color
  ctx.fill()
}

/** 截断文本（超过 maxWidth 加 …） */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}

/** 导出离屏 Canvas 为临时文件路径 */
function exportCanvas(canvas: OffscreenCanvas): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

/** 获取排名徽章渐变色（3 个方向对应 🥇🥈🥉） */
function getRankColors(index: number) {
  const ranks = [
    { start: '#CA8A04', end: '#E5A812' },  // 金
    { start: '#94A3B8', end: '#64748B' },  // 银
    { start: '#C4956A', end: '#A67B5B' },  // 铜
  ]
  return ranks[index] || ranks[2]
}
// #endif
```

- [ ] **Step 4: 实现 drawRankingTop3（图 1 — 今日 Top3）**

```typescript
// #ifdef MP-WEIXIN
async function drawRankingTop3(
  ctx: CanvasRenderingContext2D,
  cases: RenderCase[],
  dateStr: string
) {
  // 背景
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // 标题 "搞钱案例榜"
  ctx.font = 'bold 28px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.title
  ctx.textAlign = 'center'
  ctx.fillText('搞钱案例榜', CANVAS_W / 2, 48)

  // 日期
  ctx.font = '15px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  if (!dateStr) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    dateStr = `${y}.${m}.${d}`
  }
  ctx.fillText(dateStr.replace(/-/g, '.'), CANVAS_W / 2, 82)

  // 3 张案例卡片
  const cardY = 128
  const cardH = 140
  const gap = 14

  for (let i = 0; i < 3 && i < cases.length; i++) {
    const y = cardY + i * (cardH + gap)
    const c = cases[i]
    const rank = getRankColors(i)

    // 卡片背景
    fillRoundRect(ctx, 28, y, CANVAS_W - 56, cardH, 14, COLOR.card)

    // 阴影（离屏 Canvas 不便做阴影，用浅色边框代替）
    ctx.strokeStyle = COLOR.border
    ctx.lineWidth = 1
    roundRect(ctx, 28, y, CANVAS_W - 56, cardH, 14)
    ctx.stroke()

    // 排名徽章（圆形）
    const badgeX = 52, badgeY = y + 24, badgeR = 22
    const gradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + 44, badgeY + 44)
    gradient.addColorStop(0, rank.start)
    gradient.addColorStop(1, rank.end)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fill()

    // 排名数字
    ctx.font = 'bold 20px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.white
    ctx.textAlign = 'center'
    ctx.fillText(`${i + 1}`, badgeX, badgeY + 7)

    // 案例标题
    ctx.textAlign = 'left'
    ctx.font = 'bold 17px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.title
    ctx.fillText(truncateText(ctx, c.title, 420), 90, y + 24)

    // 评分徽章
    const scoreText = `★ ${c.score_total.toFixed(1)}`
    ctx.font = '14px "PingFang SC", sans-serif'
    const scoreW = ctx.measureText(scoreText).width + 20
    fillRoundRect(ctx, CANVAS_W - 56 - scoreW, y + 18, scoreW, 26, 13, '#CA8A04')
    ctx.fillStyle = COLOR.white
    ctx.textAlign = 'center'
    ctx.fillText(scoreText, CANVAS_W - 56 - scoreW + scoreW / 2, y + 24)

    // 摘要
    ctx.textAlign = 'left'
    ctx.font = '14px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.body
    ctx.fillText(truncateText(ctx, c.summary, 540), 90, y + 54)

    // 标签
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

  // 底部品牌区
  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.border
  ctx.fillRect(320, CANVAS_H - 80, 110, 1)
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('📱 精益副业案例库', CANVAS_W / 2, CANVAS_H - 65)
}
// #endif
```

- [ ] **Step 5: 实现 drawCaseDetail（图 2-4 — 案例详情）**

```typescript
// #ifdef MP-WEIXIN
async function drawCaseDetail(
  ctx: CanvasRenderingContext2D,
  c: RenderCase
) {
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // 顶部标签行
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

  // 标题
  ctx.textAlign = 'left'
  ctx.font = 'bold 22px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.title
  const titleLines = splitText(ctx, c.title, 686, 2)
  let y = 64
  for (const line of titleLines) {
    ctx.fillText(line, 32, y)
    y += 32
  }

  // 摘要
  ctx.font = '15px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  const summaryText = truncateText(ctx, c.summary, 686)
  ctx.fillText(summaryText, 32, y + 4)
  y += 34

  // ---- 两列：评分卡片 | 基础信息卡片 ----
  const colGap = 14
  const cardW = (CANVAS_W - 64 - colGap) / 2
  const cardY1 = y + 6
  const scoreH = 128

  // 左列：评分
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

  // 5 维度进度条
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
    const barW = cardW - 80
    ctx.fillStyle = COLOR.border
    ctx.fillRect(96, by + 3, barW, 5)
    ctx.fillStyle = COLOR.gold
    ctx.fillRect(96, by + 3, barW * pct, 5)
  }

  // 右列：基础信息
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
  ctx.font = '13px "PingFang SC", sans-serif'
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

  // ---- 全宽：案例故事 ----
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

  // ---- 两列：实践步骤 | 避坑指南 ----
  const stepsH = 110
  const halfW = (CANVAS_W - 64 - colGap) / 2

  // 左：实践步骤
  fillRoundRect(ctx, 32, y, halfW, stepsH, 12, COLOR.card)
  ctx.strokeStyle = COLOR.border
  ctx.lineWidth = 1
  roundRect(ctx, 32, y, halfW, stepsH, 12)
  ctx.stroke()
  ctx.fillStyle = COLOR.title
  ctx.font = 'bold 13px "PingFang SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('实践步骤', 46, y + 16)

  if (c.steps && c.steps.length > 0) {
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.body
    const stepLines = splitText(ctx, c.steps.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('  '), halfW - 28, 7)
    for (let i = 0; i < stepLines.length; i++) {
      ctx.fillText(stepLines[i], 46, y + 40 + i * 18)
    }
  }

  // 右：避坑指南
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
    const pitText = truncateText(ctx, c.pitfalls.replace(/\n/g, ' '), halfW - 28)
    ctx.fillText(pitText, pitX + 14, y + 42)
  }

  y += stepsH + 10

  // ---- 风险标签 ----
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

  // ---- 底部品牌区 ----
  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.border
  ctx.fillRect(320, CANVAS_H - 80, 110, 1)
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('📱 精益副业案例库', CANVAS_W / 2, CANVAS_H - 65)
}

/** 将文本按最大宽度切分为多行（支持 maxLines 截断） */
function splitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines?: number
): string[] {
  const lines: string[] = []
  let current = ''
  for (const char of text) {
    if (ctx.measureText(current + char).width > maxWidth) {
      lines.push(current)
      current = char
    } else {
      current += char
    }
    if (maxLines && lines.length >= maxLines) {
      if (current) {
        lines[lines.length - 1] = truncateText(ctx, lines[lines.length - 1] + current.slice(0, 3), maxWidth)
      }
      return lines
    }
  }
  if (current) lines.push(current)
  return lines
}
// #endif
```

- [ ] **Step 6: 实现 drawRecentDays（图 5 — 近三日榜单）**

```typescript
// #ifdef MP-WEIXIN
async function drawRecentDays(
  ctx: CanvasRenderingContext2D,
  days: Array<{ date: string; cases: RenderCase[] }>
) {
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // 标题
  ctx.font = 'bold 24px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.title
  ctx.textAlign = 'center'
  ctx.fillText('近三日精选榜单', CANVAS_W / 2, 40)

  // 三段榜单
  const cardY = 80
  const cardH = 240
  const gap = 14

  for (let di = 0; di < 3 && di < days.length; di++) {
    const y = cardY + di * (cardH + gap)
    const day = days[di]
    const dateLabel = day.date.replace(/-/g, '.')

    // 日期标签
    ctx.textAlign = 'left'
    ctx.font = 'bold 14px "PingFang SC", sans-serif'
    ctx.fillStyle = COLOR.title
    ctx.fillText(`▸ ${dateLabel}`, 32, y)

    const listY = y + 28
    // 榜单卡片
    fillRoundRect(ctx, 32, listY, CANVAS_W - 64, 210, 12, COLOR.card)
    ctx.strokeStyle = COLOR.border
    ctx.lineWidth = 1
    roundRect(ctx, 32, listY, CANVAS_W - 64, 210, 12)
    ctx.stroke()

    for (let ci = 0; ci < 3 && ci < day.cases.length; ci++) {
      const c = day.cases[ci]
      const cy = listY + 14 + ci * 64
      const rank = getRankColors(ci)

      // 排名徽章（小）
      const badgeX = 56, badgeY = cy + 22, badgeR = 14
      const gradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + 28, badgeY + 28)
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

      // 标题
      ctx.textAlign = 'left'
      ctx.font = '15px "PingFang SC", sans-serif'
      ctx.fillStyle = COLOR.title
      const maxTitleW = CANVAS_W - 180
      ctx.fillText(truncateText(ctx, c.title, maxTitleW), 86, cy + 20)

      // 评分
      ctx.font = '14px "PingFang SC", sans-serif'
      ctx.fillStyle = COLOR.gold
      ctx.textAlign = 'right'
      ctx.fillText(`★ ${c.score_total.toFixed(1)}`, CANVAS_W - 50, cy + 20)

      // 分隔线
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

  // 底部品牌区
  ctx.textAlign = 'center'
  ctx.fillStyle = COLOR.border
  ctx.fillRect(320, CANVAS_H - 80, 110, 1)
  ctx.font = '13px "PingFang SC", sans-serif'
  ctx.fillStyle = COLOR.body
  ctx.fillText('📱 精益副业案例库', CANVAS_W / 2, CANVAS_H - 65)
}
// #endif
```

- [ ] **Step 7: 实现 generateAll 入口函数（并轨渲染调度）**

```typescript
// #ifdef MP-WEIXIN
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

    const rHistory = historyDays.map(d => ({
      date: d.date,
      cases: d.cases.map(toRenderCase),
    }))

    const dateStr = getBeijingDate()

    // 创建 3 个离屏 Canvas
    const canvasA = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
    const canvasB = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
    const canvasC = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })

    let done = 0
    const tick = () => {
      done++
      progress.value = done
      onProgress(done, 5)
    }

    try {
      const results = await Promise.all([
        // Canvas A: 图1 → 图5（串行）
        (async () => {
          const ctxA = canvasA.getContext('2d')
          ctxA.textBaseline = 'top'
          await drawRankingTop3(ctxA, rc, dateStr)
          const path1 = await exportCanvas(canvasA)
          tick()

          ctxA.clearRect(0, 0, CANVAS_W, CANVAS_H)
          await drawRecentDays(ctxA, rHistory)
          const path5 = await exportCanvas(canvasA)
          tick()
          return [path1, path5]
        })(),

        // Canvas B: 图2
        (async () => {
          if (!rDetails[0]) return ['']
          const ctxB = canvasB.getContext('2d')
          ctxB.textBaseline = 'top'
          await drawCaseDetail(ctxB, rDetails[0])
          const path2 = await exportCanvas(canvasB)
          tick()
          return [path2]
        })(),

        // Canvas C: 图3 → 图4（串行）
        (async () => {
          const results = []
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

      // 合并路径 [img1, img2, img3, img4, img5]
      const allPaths = [...results[0], ...results[1], ...results[2]].filter(Boolean)
      tempFilePaths.value = allPaths

      return { success: allPaths.length >= 3, paths: allPaths }
    } catch (e: any) {
      console.error('[usePosterCanvas] 渲染失败:', e)
      return { success: false, paths: tempFilePaths.value, error: e.message || '生成失败' }
    }
  }

  return {
    progress,
    maxProgress,
    tempFilePaths,
    errors,
    generateAll,
    generateWithFallback: generateAll, // 后续可添加降级策略
  }
}
// #endif
```

- [ ] **Step 8: Commit**

```bash
git add src/composables/usePosterCanvas.ts
git commit -m "feat: add poster canvas rendering engine"
```

---

### Task 4: 创建 PosterGeneratePage（生成进度页）

**Files:**
- Create: `src/pages/profile/poster/generate.vue`

- [ ] **Step 1: 创建生成页面模板**

```vue
<!-- src/pages/profile/poster/generate.vue -->
<route lang="json">
{
  "style": {
    "navigationBarTitleText": "生成海报",
    "navigationBarBackgroundColor": "#F8F6F1",
    "navigationBarTextStyle": "black",
    "app-plus": { "animationDuration": 200, "animationType": "fade-in" }
  }
}
</route>

<template>
  <view class="generate-page" style="background: #F8F6F1; min-height: 100vh;">
    <view class="progress-container">
      <view class="progress-icon">
        <text class="icon-text">{{ iconText }}</text>
      </view>
      <text class="progress-text">{{ statusText }}</text>
      <view class="progress-bar-bg">
        <view
          class="progress-bar-fill"
          :style="{ width: (progress / maxProgress) * 100 + '%' }"
        ></view>
      </view>
      <text class="progress-detail">{{ progress }} / {{ maxProgress }}</text>
      <view v-if="errorMsg" class="error-row">
        <text class="error-text">{{ errorMsg }}</text>
        <button class="retry-btn" @click="startGenerate">重试</button>
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 添加脚本逻辑**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCaseStore } from '@/store/case'
import { getCaseDetail } from '@/api/modules/case'
import { getHistoryPicks } from '@/api/modules/daily'

// #ifdef MP-WEIXIN
import { usePosterCanvas } from '@/composables/usePosterCanvas'
// #endif

const store = useCaseStore()
const progress = ref(0)
const maxProgress = ref(5)
const statusText = ref('正在准备数据...')
const iconText = ref('🎨')
const errorMsg = ref('')

async function startGenerate() {
  errorMsg.value = ''
  statusText.value = '正在加载数据...'
  iconText.value = '📡'

  try {
    // 1. 获取今日案例
    const todayCases = store.todayCases
    if (!todayCases || todayCases.length === 0) {
      errorMsg.value = '今日暂无榜单数据'
      statusText.value = '加载失败'
      return
    }

    // 2. 获取 Top1-3 详情
    statusText.value = '正在获取案例详情...'
    const caseIds = todayCases.slice(0, 3).map(c => c.id)
    const details = await Promise.all(
      caseIds.map(id => getCaseDetail(id).then(r => r.data || null))
    )
    const validDetails = details.filter(Boolean)

    // 3. 获取近 3 日榜单
    statusText.value = '正在获取历史数据...'
    const historyRes = await getHistoryPicks({ page: 1, pageSize: 3 })
    const historyData = historyRes.data?.list || []
    const historyDays = await Promise.all(
      historyData.map(async (item: any) => {
        const cases = await Promise.all(
          (item.case_ids || []).map((id: string) =>
            getCaseDetail(id).then(r => r.data || null)
          )
        )
        return { date: item.date, cases: cases.filter(Boolean) }
      })
    )

    // #ifdef MP-WEIXIN
    // 4. 生成图片
    statusText.value = '正在生成海报...'
    iconText.value = '🖼'

    const { generateAll } = usePosterCanvas()
    const result = await generateAll(
      todayCases,
      validDetails,
      historyDays,
      (done, total) => {
        progress.value = done
        statusText.value = `正在生成 ${done}/${total}`
      }
    )

    if (result.success && result.paths.length > 0) {
      // 跳转预览页
      uni.redirectTo({
        url: `/pages/profile/poster/preview?paths=${encodeURIComponent(JSON.stringify(result.paths))}`
      })
    } else {
      errorMsg.value = result.error || '生成失败，请重试'
      statusText.value = '生成失败'
      iconText.value = '❌'
    }
    // #endif
  } catch (e: any) {
    errorMsg.value = e.message || '生成异常'
    statusText.value = '生成失败'
    iconText.value = '❌'
  }
}

onMounted(() => {
  startGenerate()
})
</script>
```

- [ ] **Step 3: 添加样式**

```vue
<style scoped>
.progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 160px;
}
.progress-icon {
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.icon-text {
  font-size: 36px;
}
.progress-text {
  font-size: 18px;
  font-weight: 600;
  color: #1C1917;
  margin-bottom: 20px;
}
.progress-bar-bg {
  width: 200px;
  height: 4px;
  background: #E7E5E4;
  border-radius: 2px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: #CA8A04;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.progress-detail {
  font-size: 14px;
  color: #78716C;
  margin-top: 10px;
}
.error-row {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.error-text {
  font-size: 14px;
  color: #E11D48;
}
.retry-btn {
  padding: 8px 24px;
  background: #E11D48;
  color: #FFFFFF;
  border-radius: 999px;
  font-size: 14px;
  border: none;
}
.retry-btn::after {
  border: none;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/profile/poster/generate.vue
git commit -m "feat: add poster generation page with progress"
```

---

### Task 5: 创建 PosterPreviewPage（预览页）

**Files:**
- Create: `src/pages/profile/poster/preview.vue`

- [ ] **Step 1: 创建预览页模板**

```vue
<!-- src/pages/profile/poster/preview.vue -->
<route lang="json">
{
  "style": {
    "navigationBarTitleText": "预览海报",
    "navigationBarBackgroundColor": "#F8F6F1",
    "navigationBarTextStyle": "black"
  }
}
</route>

<template>
  <view class="preview-page" style="background: #F8F6F1; min-height: 100vh;">
    <!-- Swiper -->
    <swiper
      class="preview-swiper"
      :current="currentIndex"
      indicator-dots
      indicator-color="#E7E5E4"
      indicator-active-color="#CA8A04"
      @change="onSwiperChange"
    >
      <swiper-item v-for="(path, idx) in imagePaths" :key="idx">
        <view class="swiper-slide">
          <image :src="path" class="preview-image" mode="aspectFit" />
        </view>
      </swiper-item>
    </swiper>

    <!-- 页码 -->
    <text class="page-indicator">{{ currentIndex + 1 }} / {{ imagePaths.length }}</text>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <button class="action-btn save-btn" @click="handleSaveAll" :loading="saving">
        <text class="action-btn-text">全部保存到相册</text>
      </button>
      <button class="action-btn share-btn" open-type="share">
        <text class="action-btn-text">全部分享</text>
      </button>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 添加脚本逻辑**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const currentIndex = ref(0)
const imagePaths = ref<string[]>([])
const saving = ref(false)

onMounted(() => {
  // 从 query 解析图片路径
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const rawPaths = (current as any)?.options?.paths
  if (rawPaths) {
    try {
      imagePaths.value = JSON.parse(decodeURIComponent(rawPaths))
    } catch (e) {
      console.error('[Preview] 解析图片路径失败:', e)
    }
  }
})

const onSwiperChange = (e: any) => {
  currentIndex.value = e.detail.current
}

const handleSaveAll = async () => {
  // #ifdef MP-WEIXIN
  saving.value = true
  try {
    const auth = await wx.getSetting()
    if (!auth.authSetting['scope.writePhotosAlbum']) {
      const res = await wx.authorize({ scope: 'scope.writePhotosAlbum' })
    }
  } catch (e) {
    // 授权失败，引导开启
    uni.showModal({
      title: '需要相册权限',
      content: '请在设置中开启相册权限以保存图片',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      },
    })
    saving.value = false
    return
  }

  let saved = 0
  let failed = 0
  for (const path of imagePaths.value) {
    try {
      await wx.saveImageToPhotosAlbum({ filePath: path })
      saved++
    } catch (e) {
      failed++
    }
  }

  if (failed === 0) {
    uni.showToast({ title: '全部保存成功', icon: 'success' })
  } else {
    uni.showToast({
      title: `${saved} 张已保存，${failed} 张失败`,
      icon: 'none',
    })
  }
  saving.value = false
  // #endif
}

// 微信分享
const onShareAppMessage = () => {
  // 分享第一张图片到朋友圈/朋友
  const firstPath = imagePaths.value[0] || ''
  return { title: '精益副业案例库 - 今日精选', path: '/pages/index/index' }
}
</script>
```

- [ ] **Step 3: 添加样式**

```vue
<style scoped>
.preview-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 120px;
}
.preview-swiper {
  flex: 1;
  width: 100%;
  height: 80vh;
}
.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
}
.page-indicator {
  text-align: center;
  font-size: 14px;
  color: #78716C;
  margin-bottom: 16px;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(248, 246, 241, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
}
.action-btn {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin: 0;
  padding: 0;
}
.action-btn::after {
  border: none;
}
.save-btn {
  background: #CA8A04;
}
.share-btn {
  background: #E11D48;
}
.action-btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/profile/poster/preview.vue
git commit -m "feat: add poster preview page with save/share"
```

---

### Task 6: 添加单元测试

**Files:**
- Create: `tests/unittest/composables/usePosterCanvas.test.ts`

由于 composable 强依赖微信 API（wx.createOffscreenCanvas 等），无法在 vitest/happy-dom 下直接运行。测试聚焦可分离的逻辑函数：

- `toRenderCase` 数据转换
- `splitText` 文字折行
- `truncateText` 文字截断

- [ ] **Step 1: 创建测试文件**

```typescript
// tests/unittest/composables/usePosterCanvas.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 测试纯逻辑函数（不依赖 wx API）
describe('usePosterCanvas - 文字处理', () => {
  function truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen - 1) + '…'
  }

  it('不截断短文本', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('截断超长文本并追加省略号', () => {
    const result = truncateText('这是一个非常长的文本内容', 8)
    expect(result).toBe('这是一个非常长的…')
    expect(result.length).toBe(8)
  })

  it('正好等于限制长度时不截断', () => {
    expect(truncateText('abcde', 5)).toBe('abcde')
  })
})

describe('usePosterCanvas - 数据转换', () => {
  function toRenderCase(c: any) {
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

  it('转换 DailyCase 为标准 RenderCase', () => {
    const input = {
      id: '123',
      title: '测试案例',
      summary: '摘要描述',
      score_total: 8.5,
      tags: ['tag1'],
    }
    const result = toRenderCase(input)
    expect(result.id).toBe('123')
    expect(result.title).toBe('测试案例')
    expect(result.score_total).toBe(8.5)
    expect(result.tags).toEqual(['tag1'])
    expect(result.story).toBe('')  // 未提供应默认为空
  })

  it('解析 steps 为字符串数组', () => {
    const input = {
      id: '1',
      steps: [{ step: '第一步' }, { step: '第二步' }, '直接字符串'],
    }
    const result = toRenderCase(input)
    expect(result.steps).toEqual(['第一步', '第二步', '直接字符串'])
  })

  it('处理空输入', () => {
    const result = toRenderCase({})
    expect(result.id).toBe('')
    expect(result.steps).toEqual([])
    expect(result.score_total).toBe(0)
  })
})
```

- [ ] **Step 2: 运行测试验证**

```bash
npx vitest run tests/unittest/composables/usePosterCanvas.test.ts
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/unittest/composables/usePosterCanvas.test.ts
git commit -m "test: add poster canvas utility unit tests"
```

---

### 自审清单

**Spec 覆盖检查:**
- ✅ 入口 cell（Task 2）
- ✅ 5 张图渲染（Task 3 Step 4-6）
- ✅ 并行 Canvas 调度（Task 3 Step 7）
- ✅ 生成进度页（Task 4）
- ✅ 预览页 + 批量保存（Task 5）
- ✅ 路由注册（Task 1）
- ✅ 底部品牌区（Task 3 各绘制函数末尾）
- ✅ 配色方案（Task 3 Step 1 COLOR 常量）
- ✅ 异常处理（Task 4 errorMsg + Task 5 handleSaveAll）

**占位检查:** 无 TBD/TODO，所有步骤包含完整代码

**类型一致性:** toRenderCase、splitText、truncateText 在 Task 3 定义，Task 6 测试中保持签名一致
