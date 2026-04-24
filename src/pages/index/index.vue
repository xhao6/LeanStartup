<!-- src/pages/index/index.vue -->
<route lang="json">
{
  "style": { "navigationBarTitleText": "精益副业案例库 · 今日热门" }
}
</route>

<template>
  <view class="index-page min-h-screen" style="background: #FAFAF8;">
    <!-- Hero区域 -->
    <view class="hero-section">
      <text class="hero-title">搞钱案例榜</text>
      <text class="hero-subtitle">每日 3 个可落地副业案例</text>
    </view>

    <!-- 产品容器 -->
    <view class="product-container">
      <!-- 页面标题栏 -->
      <view class="product-header">
        <view class="header-left">
          <view class="dot"></view>
          <text class="header-label">今日精选</text>
        </view>
        <view class="header-center">
          <text class="header-title">每日更新</text>
        </view>
        <view class="header-right">
          <text class="header-date">{{ todayText }}</text>
        </view>
      </view>

      <!-- 案例卡片列表 -->
      <view class="card-list">
        <!-- 骨架屏（首次加载） -->
        <template v-if="loading && !todayCases.length">
          <skeleton-card v-for="i in 3" :key="i" />
        </template>

        <!-- 案例卡片 -->
        <case-card
          v-for="(caseItem, index) in todayCases"
          :key="caseItem.id"
          :case-data="caseItem"
          :rank="index + 1"
          @click="handleCardClick"
        />

        <!-- 空状态 -->
        <view v-if="!loading && !todayCases.length" class="empty-state">
          <text class="empty-text">暂无今日榜单</text>
        </view>
      </view>
    </view>

    <!-- 订阅横幅 -->
    <view class="subscribe-section">
      <subscribe-banner />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCaseStore } from '@/store/case'
import CaseCard from '@/components/case-card/index.vue'
import SkeletonCard from '@/components/skeleton-card/index.vue'
import SubscribeBanner from '@/components/subscribe-banner/index.vue'
import type { DailyCase } from '@/api/modules/daily'

const store = useCaseStore()

const loading = computed(() => store.loading)
const todayCases = computed(() => store.todayCases)
const todayText = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

onMounted(async () => {
  await store.fetchTodayCases()
})

const handleCardClick = (caseItem: DailyCase) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${caseItem.id}` })
}
</script>

<style lang="scss" scoped>
/* Hero区域 */
.hero-section {
  text-align: center;
  padding: calc(20px + env(safe-area-inset-top)) 18px 12px;
  padding-top: calc(20px + constant(safe-area-inset-top)); /* iOS 11.0-11.4 */
}

.hero-title {
  display: block;
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 2px;
  color: #1A1A2E;
}

.hero-subtitle {
  display: block;
  font-size: 15px;
  color: #4A4A68;
  font-weight: 500;
  margin-top: 1px;
  margin-bottom: 8px;
}

/* 产品容器 */
.product-container {
  background: #FFFFFF;
  border-radius: 0;
  border: 1px solid #E8E6E1;
  overflow: hidden;
}

/* 产品标题栏 */
.product-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: #F1F5F9;
  border-bottom: 1px solid #E8E6E1;
  margin-bottom: 12px;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.header-left .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #E94560;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-left .header-label {
  font-size: 12px;
  font-weight: 500;
  color: #4A4A68;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-title {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #1A1A2E;
}

.header-right {
  flex: 1;
  text-align: right;
}

.header-date {
  font-size: 12px;
  font-weight: 500;
  color: #4A4A68;
}

/* 卡片列表 */
.card-list {
  padding: 0 15px 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  gap: 16px;
}

.empty-text {
  font-size: 16px;
  color: #9B9A97;
  font-weight: 500;
}

/* 订阅横幅区域 */
.subscribe-section {
  margin-top: 16px;
}
</style>
