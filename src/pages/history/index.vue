<template>
  <scroll-view scroll-y class="h-screen" :style="{ backgroundColor: '#FAFAF8' }">
    <!-- Header -->
    <view class="pt-12 pb-4 px-5 flex items-center justify-between">
      <view class="flex items-center">
        <view class="pulse-dot mr-2" />
        <text
          class="text-xl font-bold"
          :style="{ fontFamily: 'Noto Serif SC, serif', color: '#1A1A2E' }"
        >
          历史榜单
        </text>
      </view>
      <text
        class="text-sm"
        :style="{ color: '#9B9A97', fontFamily: 'Roboto Mono, monospace' }"
      >
        共{{ total }}期
      </text>
    </view>

    <!-- Loading State -->
    <view v-if="isLoading && records.length === 0" class="px-5 space-y-3 mt-2">
      <view
        v-for="i in 5"
        :key="i"
        class="bg-surface rounded-xl p-4"
        :style="{ border: '1px solid #E8E6E1', height: '72px' }"
      >
        <view class="flex gap-3 items-center h-full">
          <view class="w-6 h-6 rounded-lg animate-pulse" style="background-color: #E8E6E1" />
          <view class="flex-1 space-y-2">
            <view class="h-4 rounded animate-pulse" style="background-color: #E8E6E1; width: 40%" />
            <view class="h-3 rounded animate-pulse" style="background-color: #E8E6E1; width: 25%" />
          </view>
        </view>
      </view>
    </view>

    <!-- Error State -->
    <view v-else-if="error && records.length === 0" class="px-5 py-16 flex flex-col items-center">
      <text class="text-base mb-4" :style="{ color: '#4A4A68' }">{{ error }}</text>
      <view
        class="rounded-full px-6 py-2"
        :style="{ backgroundColor: '#FFFFFF', border: '1.5px solid #E94560' }"
        @tap="handleRetry"
      >
        <text class="text-sm font-semibold" :style="{ color: '#E94560' }">重试</text>
      </view>
    </view>

    <!-- Month Groups -->
    <view v-else class="px-5">
      <view v-for="group in monthGroups" :key="group.month" class="mb-5">
        <!-- Month Header -->
        <view class="flex items-center justify-between mb-2">
          <text
            class="text-sm font-semibold"
            :style="{ color: '#1A1A2E' }"
          >
            {{ group.month }}
          </text>
          <text
            class="text-xs"
            :style="{ color: '#9B9A97' }"
          >
            {{ group.count }}期
          </text>
        </view>

        <!-- Date Cards -->
        <view class="space-y-2">
          <view
            v-for="record in group.records"
            :key="record.id"
            class="bg-surface rounded-xl px-4 py-3 flex items-center justify-between"
            :style="{
              border: '1px solid #E8E6E1',
              boxShadow: '0 1px 4px rgba(26,26,46,0.04)'
            }"
            @tap="goToDate(record.date)"
          >
            <view>
              <text
                class="text-base font-medium"
                :style="{ color: '#1A1A2E' }"
              >
                {{ formatDate(record.date) }}
              </text>
            </view>
            <view class="flex items-center">
              <text
                class="text-sm mr-2"
                :style="{ color: '#9B9A97' }"
              >
                {{ record.case_ids.length }}条精选案例
              </text>
              <text
                class="text-xs"
                :style="{ color: '#C8C7C4' }"
              >
                &#x276F;
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- Load More Button -->
      <view
        v-if="hasMore"
        class="flex justify-center py-6 mb-8"
      >
        <view
          class="rounded-full px-8 py-2"
          :style="{
            background: 'linear-gradient(135deg, #E94560, #FF9A9E)',
            opacity: isLoading ? 0.6 : 1
          }"
          @tap="handleLoadMore"
        >
          <text class="text-sm font-bold text-white">
            {{ isLoading ? '加载中...' : '加载更多' }}
          </text>
        </view>
      </view>

      <!-- All Loaded -->
      <view v-else-if="records.length > 0" class="flex justify-center py-6 mb-8">
        <text class="text-xs" :style="{ color: '#C8C7C4' }">已全部加载</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useHistory } from '@/composables/useHistory'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const {
  records,
  total,
  isLoading,
  error,
  hasMore,
  monthGroups,
  fetchHistory,
  loadMore,
  refresh
} = useHistory()

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekday = WEEKDAYS[d.getDay()]
  return `${month}月${day}日 ${weekday}`
}

const goToDate = (date: string) => {
  uni.navigateTo({ url: `/pages/ranking-detail/index?date=${date}` })
}

const handleLoadMore = () => {
  loadMore()
}

const handleRetry = () => {
  refresh()
}

onShow(() => {
  if (records.value.length === 0) {
    fetchHistory(1)
  }
})
</script>

<style scoped>
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #E94560;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}
</style>
