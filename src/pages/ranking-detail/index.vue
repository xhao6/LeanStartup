<template>
  <scroll-view scroll-y class="h-screen" :style="{ backgroundColor: '#FAFAF8' }">
    <!-- Date Banner -->
    <view
      class="flex items-center gap-2 mx-5 mt-4 mb-3 px-4 py-3 rounded-2xl bg-surface"
      :style="{ border: '1px solid #E8E6E1', boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }"
    >
      <view class="pulse-dot" />
      <text
        class="text-base font-semibold"
        :style="{ color: '#1A1A2E', fontFamily: 'Noto Serif SC, serif' }"
      >
        {{ dateDisplay }}
      </text>
      <text
        class="text-xs ml-auto"
        :style="{ color: '#9B9A97' }"
      >
        {{ weekdayDisplay }}
      </text>
    </view>

    <!-- Loading State -->
    <view v-if="isLoading" class="px-5 space-y-3">
      <view
        v-for="i in 3"
        :key="i"
        class="bg-surface rounded-2xl p-4"
        :style="{ border: '1px solid #E8E6E1', boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }"
      >
        <view class="flex gap-3 items-center">
          <view class="w-8 h-8 rounded-lg animate-pulse" style="background-color: #E8E6E1" />
          <view class="flex-1 space-y-2">
            <view class="h-4 rounded animate-pulse" style="background-color: #E8E6E1; width: 75%" />
            <view class="h-3 rounded animate-pulse" style="background-color: #E8E6E1; width: 50%" />
          </view>
        </view>
      </view>
    </view>

    <!-- Error State -->
    <view v-else-if="error" class="px-5 py-16 flex flex-col items-center">
      <text class="text-base mb-4" :style="{ color: '#4A4A68' }">{{ error }}</text>
      <view
        class="rounded-full px-6 py-2"
        :style="{ backgroundColor: '#FFFFFF', border: '1.5px solid #E94560' }"
        @tap="handleRetry"
      >
        <text class="text-sm font-semibold" :style="{ color: '#E94560' }">重试</text>
      </view>
    </view>

    <!-- Empty State -->
    <view v-else-if="normalizedCases.length === 0" class="px-5 py-16 flex flex-col items-center">
      <text class="text-base" :style="{ color: '#9B9A97' }">该日暂无精选案例</text>
    </view>

    <!-- Case Card List -->
    <view v-else class="px-5 space-y-3">
      <CaseCard
        v-for="(item, index) in normalizedCases"
        :key="item.id"
        :case="item"
        :rank="index + 1"
        :show-rank="true"
        @click="goToDetail(item.id)"
      />
    </view>

    <!-- Footer Hint -->
    <view v-if="!isLoading && !error && normalizedCases.length > 0" class="py-6 flex justify-center">
      <text class="text-xs" :style="{ color: '#C8C7C4' }">点击案例查看详情</text>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CaseCard from '@/components/CaseCard.vue'
import type { CaseData } from '@/components/helpers'
import { parseSuitableFor } from '@/components/helpers'
import { useDailyPick } from '@/composables/useDailyPick'
import { useShare } from '@/composables/useShare'
import { formatDateChinese, getWeekdayName, buildShareTitle } from './helpers'

const { cases, date, isLoading, error, fetchDailyPick, refresh } = useDailyPick()

let targetDate = ''

const normalizedCases = computed<CaseData[]>(() =>
  cases.value.map(c => ({ ...c, suitable_for: parseSuitableFor(c.suitable_for) }))
)

const dateDisplay = computed(() => date.value ? formatDateChinese(date.value) : '')
const weekdayDisplay = computed(() => date.value ? getWeekdayName(date.value) : '')

useShare({
  title: targetDate ? buildShareTitle(targetDate) : '精益副业案例库',
  path: targetDate ? `/pages/ranking-detail/index?date=${targetDate}` : '/pages/index/index'
})

onLoad((options) => {
  targetDate = options?.date || ''
  fetchDailyPick(targetDate || undefined)
})

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?case_id=${id}` })
}

const handleRetry = () => refresh()
</script>

<style scoped>
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #E94560;
  animation: pulse 2s ease-in-out infinite;
  flex-shrink: 0;
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
