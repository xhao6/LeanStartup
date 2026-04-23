<template>
  <scroll-view scroll-y class="h-screen" :style="{ backgroundColor: '#FAFAF8' }">
    <!-- Header -->
    <view class="pt-12 pb-6 px-5">
      <view class="text-center">
        <text class="text-[28px] font-bold" :style="{ fontFamily: 'Noto Serif SC, serif', color: '#1A1A2E' }">
          精益副业案例库
        </text>
      </view>
      <view class="text-center mt-1">
        <text class="text-sm" :style="{ color: '#4A4A68' }">
          每日精选3个高价值副业案例
        </text>
      </view>
    </view>

    <!-- Daily Pick Banner -->
    <view
      class="mx-5 mb-4 flex items-center justify-between px-4 py-3 rounded-xl"
      :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }"
    >
      <view class="flex items-center">
        <view class="pulse-dot mr-2" />
        <text class="text-base font-semibold" :style="{ color: '#1A1A2E' }">
          今日精选
        </text>
      </view>
      <text class="text-sm" :style="{ color: '#9B9A97', fontFamily: 'Roboto Mono, monospace' }">
        {{ date || '--' }}
      </text>
    </view>

    <!-- Loading State -->
    <view v-if="isLoading" class="px-5 space-y-3">
      <view
        v-for="i in 3"
        :key="i"
        class="bg-white rounded-2xl p-4"
        :style="{ border: '1px solid #E8E6E1', height: '120px' }"
      >
        <view class="flex gap-3">
          <view class="w-8 h-8 rounded-lg animate-pulse" style="background-color: #E8E6E1" />
          <view class="flex-1 space-y-2">
            <view class="h-4 w-3/4 rounded animate-pulse" style="background-color: #E8E6E1" />
            <view class="h-3 w-full rounded animate-pulse" style="background-color: #E8E6E1" />
            <view class="h-3 w-1/2 rounded animate-pulse" style="background-color: #E8E6E1" />
          </view>
        </view>
      </view>
    </view>

    <!-- Error State -->
    <view v-else-if="error" class="px-5 py-10 flex flex-col items-center">
      <text class="text-base mb-4" :style="{ color: '#4A4A68' }">{{ error }}</text>
      <view
        class="rounded-full px-6 py-2"
        :style="{ backgroundColor: '#FFFFFF', border: '1.5px solid #E94560' }"
        @tap="handleRetry"
      >
        <text class="text-sm font-semibold" :style="{ color: '#E94560' }">重试</text>
      </view>
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

    <!-- Subscription Banner -->
    <view class="mx-5 mt-6 mb-10">
      <view
        class="relative overflow-hidden rounded-2xl px-5 py-4 flex items-center justify-between"
        :style="subBannerStyle"
        @tap="handleSubscribe"
      >
        <view class="shimmer-overlay" />
        <view class="flex items-center relative z-10">
          <text class="text-lg mr-2">&#x1F514;</text>
          <text class="text-base font-semibold text-white">订阅每日精选提醒</text>
        </view>
        <text class="text-sm text-white relative z-10" style="opacity: 0.9">立即订阅</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CaseCard from '@/components/CaseCard.vue'
import type { CaseData } from '@/components/helpers'
import { parseSuitableFor } from '@/components/helpers'
import { useDailyPick } from '@/composables/useDailyPick'
import { useShare } from '@/composables/useShare'

const { cases, date, isLoading, error, fetchDailyPick, refresh } = useDailyPick()

/** Normalize cases to CaseData shape (ensure suitable_for is always string[]) */
const normalizedCases = computed<CaseData[]>(() =>
  cases.value.map(c => ({
    ...c,
    suitable_for: parseSuitableFor(c.suitable_for)
  }))
)

useShare({
  title: '精益副业案例库 - 今日精选',
  path: '/pages/index/index'
})

const subBannerStyle = computed(() => ({
  background: 'linear-gradient(135deg, #E94560, #FF9A9E)'
}))

onShow(() => {
  fetchDailyPick()
})

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?case_id=${id}` })
}

const handleRetry = () => {
  refresh()
}

const handleSubscribe = () => {
  uni.showToast({
    title: '功能开发中',
    icon: 'none',
    duration: 2000
  })
}
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

.shimmer-overlay {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.15),
    transparent
  );
  animation: shimmer 2.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>
