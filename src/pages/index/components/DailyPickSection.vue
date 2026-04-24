<template>
  <view class="daily-pick">
    <view class="home-header">
      <view class="home-dot" />
      <text class="home-logo-area">今日精选</text>
      <text class="home-date">{{ displayDate }}</text>
    </view>

    <view class="case-list">
      <CaseCard
        v-for="(item, index) in cases"
        :key="item.id"
        :case-data="item"
        :rank="index + 1"
        @click="(data: DailyCase) => navigateToDetail(data.id)"
      />
    </view>

    <LoadingSpinner v-if="loading" />
    <EmptyTip v-if="!loading && cases.length === 0" text="暂无数据" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CaseCard from '@/components/case-card/index.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import EmptyTip from '@/components/EmptyTip.vue'
import { getDailyPick } from '@/api/modules/daily'
import type { DailyCase } from '@/api/modules/daily'

const loading = ref(true)
const cases = ref<DailyCase[]>([])
const displayDate = ref('')

const loadDailyPick = async () => {
  loading.value = true
  try {
    const res = await getDailyPick()
    if (res.success && res.data) {
      cases.value = res.data.cases || []
      displayDate.value = res.data.date || new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    }
  } catch (e) {
    console.error('加载今日精选失败', e)
  } finally {
    loading.value = false
  }
}

const navigateToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${id}` })
}

onMounted(loadDailyPick)
</script>

<style lang="scss" scoped>
.daily-pick {
  padding: 0 14rpx;
}
.home-header {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 20rpx 4rpx;
  margin-bottom: 12rpx;
}
.home-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #E94560;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
.home-logo-area {
  font-family: 'Noto Serif SC', serif;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A1A2E;
}
.home-date {
  font-size: 22rpx;
  color: #9B9A97;
  font-family: 'Roboto Mono', monospace;
  margin-left: auto;
}
.case-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
</style>