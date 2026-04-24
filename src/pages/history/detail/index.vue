<template>
  <view class="history-detail-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="往期榜单"
    />

    <view class="date-banner">
      <view class="date-dot" />
      <text class="date-text">{{ displayDate }}</text>
      <text class="weekday-text">{{ weekday }}</text>
    </view>

    <view class="case-list">
      <CaseCard
        v-for="(item, index) in cases"
        :key="item.id"
        :case="item"
        :rank="index + 1"
        @click="navigateToDetail"
      />
    </view>

    <wd-loading v-if="loading" />
    <wd-empty v-if="!loading && cases.length === 0" description="暂无数据" />

    <view class="footer-tip">
      <text>查看更多案例可前往「历史榜单」</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CaseCard from '@/components/CaseCard.vue'
import { getDailyPick } from '@/api/modules/daily'
import type { DailyCase } from '@/api/modules/daily'

const loading = ref(true)
const cases = ref<DailyCase[]>([])

const pages = getCurrentPages()
const current = pages[pages.length - 1]
const date = (current as any)?.options?.date || new Date().toISOString().split('T')[0]

const displayDate = computed(() => {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
})

const weekday = computed(() => {
  const d = new Date(date)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await getDailyPick(date)
    if (res.success && res.data?.cases) {
      cases.value = res.data.cases
    }
  } finally {
    loading.value = false
  }
}

const goBack = () => uni.navigateBack()
const navigateToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${id}` })
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.history-detail-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding: 0 32rpx 32rpx;
}
.date-banner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 0 32rpx;
}
.date-dot {
  width: 12rpx;
  height: 12rpx;
  background: #E94560;
  border-radius: 50%;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
.date-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 40rpx;
  font-weight: 600;
  color: #1A1A2E;
}
.weekday-text {
  font-size: 28rpx;
  color: #9B9A97;
}
.case-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.footer-tip {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #9B9A97;
}
</style>
