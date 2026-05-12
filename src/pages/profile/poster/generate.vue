<route lang="json">
{
  "style": {
    "navigationBarTitleText": "生成海报",
    "navigationBarBackgroundColor": "#F8F6F1",
    "navigationBarTextStyle": "black"
  }
}
</route>

<template>
  <view class="generate-page">
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
      <view v-if="errorMsg && !emptyData" class="error-row">
        <text class="error-text">{{ errorMsg }}</text>
        <button class="retry-btn" :disabled="isGenerating" @click="startGenerate">重试</button>
      </view>
      <view v-if="emptyData" class="error-row">
        <text class="error-text">{{ errorMsg }}</text>
        <button class="back-btn" @click="goBack">返回</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCaseStore } from '@/store/case'
import { getCaseDetail } from '@/api/modules/case'
import { getHistoryPicks } from '@/api/modules/daily'

const store = useCaseStore()
const progress = ref(0)
const maxProgress = ref(5)
const statusText = ref('正在准备数据...')
const iconText = ref('🎨')
const errorMsg = ref('')
const emptyData = ref(false)
const isGenerating = ref(false)
let isUnmounted = false

onUnmounted(() => { isUnmounted = true })

// Canvas rendering helpers
const CANVAS_W = 750, CANVAS_H = 1000
const C = { bg: '#F8F6F1', card: '#FFFFFF', title: '#1C1917', body: '#78716C', gold: '#CA8A04', border: '#E7E5E4', tagBg: '#F0EDE8', white: '#FFFFFF' }

function toRenderCase(c: any) {
  return {
    id: c.id || '', title: c.title || '', summary: c.summary || '', score_total: c.score_total || 0,
    cost: c.cost || '', source_account: c.source_account || '', tags: c.tags || [],
    suitable_for: c.suitable_for || '', cycle: c.cycle || '', source_url: c.source_url || '',
    story: c.story || '', score_feasibility: c.score_feasibility || 0, score_profit: c.score_profit || 0,
    score_timeliness: c.score_timeliness || 0, score_detail: c.score_detail || 0, score_fitness: c.score_fitness || 0,
    expected_revenue: c.expected_revenue || '',
    steps: (c.steps || []).map((s: any) => typeof s === 'string' ? s : s.step || ''),
    tools: c.tools || [], pitfalls: c.pitfalls || '', risk_tags: c.risk_tags || [], image: c.image || '',
  }
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}
function fillRoundRect(ctx: any, x: number, y: number, w: number, h: number, r: number, color: string) {
  roundRect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill()
}
function truncateText(ctx: any, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text; while (ctx.measureText(t + '…').width > maxW && t.length > 0) t = t.slice(0, -1); return t + '…'
}
function splitText(ctx: any, text: string, maxW: number, maxL?: number): string[] {
  const lines: string[] = []; let cur = ''
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) { if (cur) lines.push(cur); cur = ch }
    else { cur += ch }
    if (maxL && lines.length >= maxL) { if (cur) lines[lines.length - 1] = truncateText(ctx, lines[lines.length - 1], maxW); return lines }
  }
  if (cur) lines.push(cur); return lines
}
function exportCanvas(canvas: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const dpr = wx.getSystemInfoSync().pixelRatio || 2
    wx.canvasToTempFilePath({ canvas, destWidth: CANVAS_W * dpr, destHeight: CANVAS_H * dpr, success: (r: any) => resolve(r.tempFilePath), fail: reject })
  })
}
function rankColors(index: number) { const r = [{ start: '#CA8A04', end: '#E5A812' }, { start: '#94A3B8', end: '#64748B' }, { start: '#C4956A', end: '#A67B5B' }]; return r[index] || r[2] }
function beijingDate(): string { const d = new Date(), b = new Date(d.getTime() + 8 * 3600000); return `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2,'0')}-${String(b.getUTCDate()).padStart(2,'0')}` }

async function drawRanking(ctx: any, cases: any[], dateStr: string) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.font = 'bold 28px "PingFang SC", sans-serif'; ctx.fillStyle = C.title; ctx.textAlign = 'center'
  ctx.fillText('搞钱案例榜', CANVAS_W / 2, 48)
  ctx.font = '15px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText(dateStr.replace(/-/g, '.'), CANVAS_W / 2, 82)
  for (let i = 0; i < 3 && i < cases.length; i++) {
    const y = 128 + i * 154, c = cases[i], rc = rankColors(i)
    fillRoundRect(ctx, 28, y, 694, 140, 14, C.card); ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRect(ctx, 28, y, 694, 140, 14); ctx.stroke()
    const g = ctx.createLinearGradient(30, y + 2, 74, y + 46); g.addColorStop(0, rc.start); g.addColorStop(1, rc.end)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(52, y + 24, 22, 0, Math.PI * 2); ctx.fill()
    ctx.font = 'bold 20px "PingFang SC", sans-serif'; ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.fillText(`${i + 1}`, 52, y + 31)
    ctx.textAlign = 'left'; ctx.font = 'bold 17px "PingFang SC", sans-serif'; ctx.fillStyle = C.title; ctx.fillText(truncateText(ctx, c.title, 420), 90, y + 24)
    const st = `★ ${c.score_total.toFixed(1)}`; const sw = ctx.measureText(st).width + 20
    fillRoundRect(ctx, 694 - sw, y + 18, sw, 26, 13, '#CA8A04'); ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.fillText(st, 694 - sw + sw / 2, y + 24)
    ctx.textAlign = 'left'; ctx.font = '14px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText(truncateText(ctx, c.summary, 540), 90, y + 54)
    let tx = 90; for (const tag of (c.tags || []).slice(0, 3)) { const tw = ctx.measureText(tag).width + 16; if (tx + tw > 722) break; fillRoundRect(ctx, tx, y + 82, tw, 24, 12, C.tagBg); ctx.fillStyle = C.body; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tag, tx + tw / 2, y + 89); tx += tw + 10 }
  }
  ctx.textAlign = 'center'; ctx.fillStyle = C.border; ctx.fillRect(320, 920, 110, 1); ctx.font = '13px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText('📱 精益副业案例库', 375, 935)
}

async function drawDetail(ctx: any, c: any) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  let tx = 32; ctx.textAlign = 'left'
  for (const tag of (c.tags || []).slice(0, 4)) { const tw = ctx.measureText(tag).width + 16; fillRoundRect(ctx, tx, 28, tw, 24, 12, C.tagBg); ctx.fillStyle = C.body; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(tag, tx + tw / 2, 35); tx += tw + 8 }
  let y = 64; ctx.textAlign = 'left'; ctx.font = 'bold 22px "PingFang SC", sans-serif'; ctx.fillStyle = C.title
  for (const l of splitText(ctx, c.title, 686, 2)) { ctx.fillText(l, 32, y); y += 32 }
  ctx.font = '15px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText(truncateText(ctx, c.summary, 686), 32, y + 4); y += 34
  const cw = 336, cy = y + 6; fillRoundRect(ctx, 32, cy, cw, 128, 12, C.card); ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRect(ctx, 32, cy, cw, 128, 12); ctx.stroke()
  ctx.textAlign = 'center'; ctx.font = 'bold 36px "PingFang SC", sans-serif'; ctx.fillStyle = C.gold; ctx.fillText(`★ ${c.score_total.toFixed(1)}`, 200, cy + 12)
  ctx.font = '11px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText('AI 综合评分', 200, cy + 54)
  const dims = [{ l: '可行性', v: c.score_feasibility }, { l: '盈利性', v: c.score_profit }, { l: '时效性', v: c.score_timeliness }, { l: '详细度', v: c.score_detail }, { l: '适合度', v: c.score_fitness }]
  ctx.textAlign = 'left'; ctx.font = '10px "PingFang SC", sans-serif'
  for (let i = 0; i < dims.length; i++) { const by = cy + 68 + i * 12; ctx.fillStyle = C.body; ctx.fillText(dims[i].l, 40, by); const pct = Math.min(dims[i].v / 10, 1); ctx.fillStyle = C.border; ctx.fillRect(96, by + 3, 256, 5); ctx.fillStyle = C.gold; ctx.fillRect(96, by + 3, 256 * pct, 5) }
  fillRoundRect(ctx, 382, cy, cw, 128, 12, C.card); ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRect(ctx, 382, cy, cw, 128, 12); ctx.stroke()
  const info = [{ l: '成本', v: c.cost }, { l: '周期', v: c.cycle }, { l: '预期收益', v: c.expected_revenue }, { l: '适合', v: c.suitable_for }]
  for (let i = 0; i < info.length; i++) { const iy = cy + 10 + Math.floor(i / 2) * 55, ix = 394 + (i % 2) * 168; ctx.fillStyle = C.body; ctx.font = '11px "PingFang SC", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(info[i].l, ix, iy); ctx.fillStyle = C.title; ctx.font = '13px "PingFang SC", sans-serif'; ctx.fillText(truncateText(ctx, info[i].v, 152), ix, iy + 18) }
  y = cy + 138
  if (c.story) { fillRoundRect(ctx, 32, y, 686, 100, 12, C.card); ctx.fillStyle = C.title; ctx.font = 'bold 14px "PingFang SC", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('案例故事', 46, y + 16); ctx.font = '13px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText(truncateText(ctx, c.story.replace(/\n/g, ' '), 650), 46, y + 42); y += 110 } else { y += 4 }
  const hw = 336
  fillRoundRect(ctx, 32, y, hw, 110, 12, C.card); ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRect(ctx, 32, y, hw, 110, 12); ctx.stroke()
  ctx.fillStyle = C.title; ctx.font = 'bold 13px "PingFang SC", sans-serif'; ctx.fillText('实践步骤', 46, y + 16)
  if (c.steps && c.steps.length > 0) { ctx.font = '12px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; const sl = splitText(ctx, c.steps.slice(0, 3).map((s: string, i: number) => `${i + 1}. ${s}`).join('  '), 308, 7); for (let i = 0; i < sl.length; i++) ctx.fillText(sl[i], 46, y + 40 + i * 18) }
  if (c.pitfalls) { fillRoundRect(ctx, 382, y, hw, 110, 12, C.card); ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRect(ctx, 382, y, hw, 110, 12); ctx.stroke(); ctx.fillStyle = C.title; ctx.font = 'bold 13px "PingFang SC", sans-serif'; ctx.fillText('避坑指南', 396, y + 16); ctx.font = '12px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText(truncateText(ctx, c.pitfalls.replace(/\n/g, ' '), 308), 396, y + 42) }
  y += 120
  if (c.risk_tags && c.risk_tags.length > 0) { let rx = 32; ctx.textAlign = 'left'; for (const tag of c.risk_tags.slice(0, 4)) { const tw = ctx.measureText(`🔖 ${tag}`).width + 16; fillRoundRect(ctx, rx, y, tw, 24, 12, C.tagBg); ctx.fillStyle = C.body; ctx.font = '12px "PingFang SC", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`🔖 ${tag}`, rx + tw / 2, y + 7); rx += tw + 8 } y += 34 }
  ctx.textAlign = 'center'; ctx.fillStyle = C.border; ctx.fillRect(320, 920, 110, 1); ctx.font = '13px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText('📱 精益副业案例库', 375, 935)
}

async function drawHistory(ctx: any, days: Array<{ date: string; cases: any[] }>) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.font = 'bold 24px "PingFang SC", sans-serif'; ctx.fillStyle = C.title; ctx.textAlign = 'center'; ctx.fillText('近三日精选榜单', 375, 40)
  for (let di = 0; di < 3 && di < days.length; di++) {
    const y = 80 + di * 268, day = days[di]; ctx.textAlign = 'left'; ctx.font = 'bold 14px "PingFang SC", sans-serif'; ctx.fillStyle = C.title; ctx.fillText(`▸ ${day.date.replace(/-/g, '.')}`, 32, y)
    const ly = y + 28; fillRoundRect(ctx, 32, ly, 686, 210, 12, C.card); ctx.strokeStyle = C.border; ctx.lineWidth = 1; roundRect(ctx, 32, ly, 686, 210, 12); ctx.stroke()
    for (let ci = 0; ci < 3 && ci < day.cases.length; ci++) {
      const c = day.cases[ci], ccy = ly + 14 + ci * 64, rc = rankColors(ci)
      const g = ctx.createLinearGradient(42, ccy + 8, 70, ccy + 36); g.addColorStop(0, rc.start); g.addColorStop(1, rc.end)
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(56, ccy + 22, 14, 0, Math.PI * 2); ctx.fill()
      ctx.font = 'bold 13px "PingFang SC", sans-serif'; ctx.fillStyle = C.white; ctx.textAlign = 'center'; ctx.fillText(`${ci + 1}`, 56, ccy + 27)
      ctx.textAlign = 'left'; ctx.font = '15px "PingFang SC", sans-serif'; ctx.fillStyle = C.title; ctx.fillText(truncateText(ctx, c.title, 570), 86, ccy + 20)
      ctx.font = '14px "PingFang SC", sans-serif'; ctx.fillStyle = C.gold; ctx.textAlign = 'right'; ctx.fillText(`★ ${c.score_total.toFixed(1)}`, 700, ccy + 20)
      if (ci < 2) { ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(46, ccy + 60); ctx.lineTo(704, ccy + 60); ctx.stroke() }
    }
  }
  ctx.textAlign = 'center'; ctx.fillStyle = C.border; ctx.fillRect(320, 920, 110, 1); ctx.font = '13px "PingFang SC", sans-serif'; ctx.fillStyle = C.body; ctx.fillText('📱 精益副业案例库', 375, 935)
}

async function generateAllImages(
  todayCases: any[], caseDetails: any[], historyDays: Array<{ date: string; cases: any[] }>,
  onProgress: (d: number, t: number) => void
) {
  const rc = todayCases.map(toRenderCase), rDetails = caseDetails.map(toRenderCase)
  const rHistory = historyDays.map(d => ({ date: d.date, cases: d.cases.map(toRenderCase) })), dateStr = beijingDate()
  const cA = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
  const cB = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
  const cC = wx.createOffscreenCanvas({ type: '2d', width: CANVAS_W, height: CANVAS_H })
  let done = 0, paths: string[] = []
  const tick = () => { done++; onProgress(done, 5) }
  try {
    const results = await Promise.all([
      (async () => { const ctx = cA.getContext('2d'); ctx.textBaseline = 'top'; await drawRanking(ctx, rc, dateStr); const p1 = await exportCanvas(cA); tick(); ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); ctx.textBaseline = 'top'; await drawHistory(ctx, rHistory); const p5 = await exportCanvas(cA); tick(); return [p1, p5] })(),
      (async () => { if (!rDetails[0]) return ['']; const ctx = cB.getContext('2d'); ctx.textBaseline = 'top'; await drawDetail(ctx, rDetails[0]); const p = await exportCanvas(cB); tick(); return [p] })(),
      (async () => { const p: string[] = [], ctx = cC.getContext('2d'); ctx.textBaseline = 'top'; if (rDetails[1]) { await drawDetail(ctx, rDetails[1]); p.push(await exportCanvas(cC)); tick() } if (rDetails[2]) { ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); ctx.textBaseline = 'top'; await drawDetail(ctx, rDetails[2]); p.push(await exportCanvas(cC)); tick() } return p })(),
    ])
    paths = [...results[0], ...results[1], ...results[2]].filter(Boolean)
    return { success: paths.length >= 3, paths }
  } catch (e: any) { return { success: false, paths, error: e.message || '生成失败' } }
}

async function startGenerate() {
  if (isGenerating.value) return
  if (emptyData.value) return

  isGenerating.value = true
  progress.value = 0
  errorMsg.value = ''
  statusText.value = '正在加载数据...'
  iconText.value = '📡'

  try {
    const todayCases = store.todayCases
    if (!todayCases || todayCases.length === 0) {
      emptyData.value = true
      errorMsg.value = '今日暂无榜单数据'
      statusText.value = '加载失败'
      isGenerating.value = false
      return
    }

    statusText.value = '正在获取案例详情...'
    const caseIds = todayCases.slice(0, 3).map((c: any) => c.id)
    const details = await Promise.all(
      caseIds.map((id: string) => getCaseDetail(id).then(r => r.data || null))
    )
    const validDetails = details.filter(Boolean)

    if (isUnmounted) return
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

    if (isUnmounted) return

    // 图 5 需包含今天数据
    function getBeijingDate(): string {
      const d = new Date()
      const beijing = new Date(d.getTime() + 8 * 3600000)
      const y = beijing.getUTCFullYear()
      const m = String(beijing.getUTCMonth() + 1).padStart(2, '0')
      const day = String(beijing.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    const todayEntry = {
      date: getBeijingDate(),
      cases: todayCases.slice(0, 3),
    }
    const allDays = [todayEntry, ...historyDays]

    statusText.value = '正在生成海报...'
    iconText.value = '🖼'

    const result = await generateAllImages(
      todayCases,
      validDetails,
      allDays,
      (done: number) => {
        progress.value = done
        statusText.value = `正在生成 ${done}/${maxProgress.value}`
      }
    )

    if (isUnmounted) return

    if (result.success && result.paths.length > 0) {
      uni.setStorageSync('poster_paths', result.paths)
      uni.redirectTo({
        url: '/pages/profile/poster/preview'
      })
    } else {
      errorMsg.value = result.error || '生成失败，请重试'
      statusText.value = '生成失败'
      iconText.value = '❌'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '生成异常'
    statusText.value = '生成失败'
    iconText.value = '❌'
  } finally {
    isGenerating.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}

onMounted(() => {
  startGenerate()
})
</script>

<style scoped>
.generate-page {
  background: #F8F6F1;
  min-height: 100vh;
}
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
.retry-btn[disabled] {
  opacity: 0.5;
}
.back-btn {
  padding: 8px 24px;
  background: #78716C;
  color: #FFFFFF;
  border-radius: 999px;
  font-size: 14px;
  border: none;
}
.back-btn::after {
  border: none;
}
</style>
