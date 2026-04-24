<template>
  <view class="daily-pick">
    <view class="section-header">
      <text class="section-title">今日精选</text>
      <text class="section-date">{{ displayDate }}</text>
    </view>

    <view class="case-list">
      <CaseCard
        v-for="(item, index) in cases"
        :key="item.id"
        :case="item"
        :rank="index + 1"
        @click="(id: string) => navigateToDetail(id)"
      />
    </view>

<LoadingSpinner v-if="loading" />
    <EmptyTip v-if="!loading && cases.length === 0" text="暂无数据" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CaseCard from '@/components/CaseCard.vue'
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
  padding: 0 32rpx;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A2E;
}
.section-date {
  font-family: 'Roboto Mono', monospace;
  font-size: 24rpx;
  color: #9B9A97;
}
.case-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>