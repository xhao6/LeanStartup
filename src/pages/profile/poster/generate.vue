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

const CANVAS_W = 750, CANVAS_H = 1000
// Canvas rendering helpers
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
    const dpr = wx.getDeviceInfo().pixelRatio || 2
    wx.canvasToTempFilePath({ canvas, destWidth: CANVAS_W * dpr, destHeight: CANVAS_H * dpr, success: (r: any) => resolve(r.tempFilePath), fail: reject })
  })
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
      statusText.value = '正在保存到相册...'
      let saved = 0
      for (const p of result.paths) {
        try {
          await wx.saveImageToPhotosAlbum({ filePath: p })
          saved++
        } catch { /* 个别失败不影响其余 */ }
      }
      if (isUnmounted) return
      if (saved === result.paths.length) {
        uni.showToast({ title: `${saved} 张海报已保存到相册`, icon: 'success' })
      } else {
        uni.showToast({ title: `${saved}/${result.paths.length} 张已保存`, icon: 'none' })
      }
      setTimeout(() => uni.navigateBack(), 1500)
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
