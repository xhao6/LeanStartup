<!-- src/pages/history/index.vue -->
<route lang="json">
{
  "style": {
    "navigationBarTitleText": "精益副业案例库 · 往期榜单"
  }
}
</route>

<template>
  <view class="history-page min-h-screen" style="background: #FAFAF8;">
    <!-- 顶部标题栏 -->
    <view class="history-header">
      <view class="header-status">
        <view class="dot"></view>
        <text class="header-label">历史</text>
      </view>
      <view class="header-title">
        <text class="title-text">往期榜单</text>
      </view>
      <view class="header-count">
        <text class="count-text">共 {{ totalItems }} 期</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading && !historyList.length" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 历史列表 -->
    <view v-else class="history-content">
      <!-- 按月分组 -->
      <view
        v-for="(group, month) in groupedHistory"
        :key="month"
        class="date-group"
      >
        <!-- 月份标题 -->
        <view class="date-header">
          <text class="date-title">{{ month }}</text>
          <text class="date-count">{{ group.length }} 期</text>
        </view>

        <!-- 历史卡片 -->
        <view
          v-for="item in group"
          :key="item.date"
          class="history-card"
          @click="handleItemClick(item)"
        >
          <!-- 日期 -->
          <text class="history-date">{{ formatDate(item.date) }}</text>

          <!-- 案例列表（显示 top 3） -->
          <view class="history-cases">
            <view
              v-for="(caseId, index) in (item.case_ids || []).slice(0, 3)"
              :key="caseId"
              class="history-case"
            >
              <text class="history-rank" :class="getRankClass(index + 1)">
                {{ index + 1 }}
              </text>
              <text class="history-name">{{ getCaseDisplay(caseId) }}</text>
            </view>
          </view>

          <!-- 箭头 -->
          <text class="history-arrow">›</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="handleLoadMore">
        <text class="load-more-text">{{ loading ? '加载中...' : '加载更多' }}</text>
      </view>

      <!-- 列表结束 -->
      <view v-if="!hasMore && historyList.length" class="list-end">
        <text class="end-text">已浏览全部 {{ historyList.length }} 期榜单</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCaseStore } from '@/store/case'
import type { HistoryItem } from '@/api/modules/daily'

const store = useCaseStore()

const loading = computed(() => store.loading)
const historyList = computed(() => store.historyList)
const hasMore = computed(() => store.hasMoreHistory)
const totalItems = computed(() => store.historyTotal)

onMounted(async () => {
  await store.fetchHistoryList({ page: 1, pageSize: 10 })
})

const handleLoadMore = async () => {
  if (!hasMore.value || loading.value) return
  const nextPage = Math.floor(historyList.value.length / 10) + 1
  await store.fetchHistoryList({ page: nextPage, pageSize: 10 })
}

const handleItemClick = (item: HistoryItem) => {
  uni.navigateTo({ url: `/pages/history/detail/index?date=${item.date}` })
}

// 按月分组
const groupedHistory = computed(() => {
  const groups: Record<string, HistoryItem[]> = {}

  for (const item of historyList.value) {
    const date = new Date(item.date)
    const month = `${date.getFullYear()}年${date.getMonth() + 1}月`

    if (!groups[month]) {
      groups[month] = []
    }
    groups[month].push(item)
  }

  return groups
})

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

const getCaseDisplay = (caseId: string): string => {
  const caseItem = store.getCaseById(caseId)
  if (!caseItem) return '加载中...'
  return caseItem.title || '未知案例'
}

const getRankClass = (rank: number) => {
  const classes: Record<number, string> = {
    1: 'rank-gold',
    2: 'rank-silver',
    3: 'rank-bronze'
  }
  return classes[rank] || 'rank-bronze'
}
</script>

<style scoped>
.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: #F5F5F3;
  border-bottom: 1px solid #E8E6E1;
  position: relative;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
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

.header-label {
  font-size: 12px;
  font-weight: 500;
  color: #4A4A68;
}

.header-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.title-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 23px;
  font-weight: 700;
  color: #1A1A2E;
}

.header-count {
  flex: 1;
  text-align: right;
}

.count-text {
  font-size: 12px;
  color: #9B9A97;
}

.history-content {
  padding: 0 15px 15px;
}

/* Date Group */
.date-group {
  margin-bottom: 20px;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 3px;
}

.date-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A2E;
}

.date-count {
  font-size: 12px;
  color: #9B9A97;
}

/* History Card */
.history-card {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #E8E6E1;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 10px;
}

.history-card:active {
  opacity: 0.85;
}

.history-date {
  font-family: 'Roboto Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #9B9A97;
  min-width: 50px;
}

.history-cases {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px;
  min-width: 0;
}

.history-case {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.history-rank {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 24px;
  text-align: center;
}

.history-rank.rank-gold {
  background: linear-gradient(135deg, #FBBF24 0%, #F97316 100%);
  color: white;
}

.history-rank.rank-silver {
  background: linear-gradient(135deg, #94A3B8 0%, #64748B 100%);
  color: white;
}

.history-rank.rank-bronze {
  background: linear-gradient(135deg, #D4A574 0%, #B8956C 100%);
  color: white;
}

.history-name {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A2E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.history-arrow {
  font-size: 20px;
  color: #9B9A97;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.loading-text {
  font-size: 14px;
  color: #9B9A97;
  font-weight: 500;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Load More */
.load-more {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.load-more-text {
  font-size: 14px;
  color: #4A4A68;
  padding: 8px 24px;
  border: 1px solid #E8E6E1;
  border-radius: 20px;
}

/* List End */
.list-end {
  text-align: center;
  padding: 30px 0;
}

.end-text {
  font-size: 14px;
  color: #9B9A97;
}
</style>
