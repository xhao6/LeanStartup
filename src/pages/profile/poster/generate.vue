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
      <view v-if="errorMsg" class="error-row">
        <text class="error-text">{{ errorMsg }}</text>
        <button class="retry-btn" @click="startGenerate">重试</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCaseStore } from '@/store/case'
import { getCaseDetail } from '@/api/modules/case'
import { getHistoryPicks } from '@/api/modules/daily'

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
    const todayCases = store.todayCases
    if (!todayCases || todayCases.length === 0) {
      errorMsg.value = '今日暂无榜单数据'
      statusText.value = '加载失败'
      return
    }

    statusText.value = '正在获取案例详情...'
    const caseIds = todayCases.slice(0, 3).map((c: any) => c.id)
    const details = await Promise.all(
      caseIds.map((id: string) => getCaseDetail(id).then(r => r.data || null))
    )
    const validDetails = details.filter(Boolean)

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
    statusText.value = '正在生成海报...'
    iconText.value = '🖼'

    const { usePosterCanvas } = await import('@/composables/usePosterCanvas')
    const { generateAll } = usePosterCanvas()
    const result = await generateAll(
      todayCases,
      validDetails,
      historyDays,
      (done: number) => {
        progress.value = done
        statusText.value = `正在生成 ${done}/${maxProgress.value}`
      }
    )

    if (result.success && result.paths.length > 0) {
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
</style>
