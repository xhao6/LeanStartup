<template>
  <view class="case-card" :class="`rank-${rank}`" @click="emit('click', props.case.id)">
    <view class="rank-badge" :style="{ background: rankColor }">{{ rank }}</view>
    <view class="card-content">
      <text class="card-title">{{ props.case.title }}</text>
      <view class="card-tags">
        <text class="score-inline">★ {{ props.case.score_total }}</text>
        <text class="tag-pill tag-source">{{ props.case.source_account }}</text>
      </view>
      <text class="card-summary">{{ props.case.summary }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RANK_COLORS } from '@/utils/constants'

interface CaseItem { id: string; title: string; summary: string; score_total: number; cost: string; source_account: string }
interface Props { case: CaseItem; rank: number }
const props = defineProps<Props>()
const emit = defineEmits<{ click: [id: string] }>()

const rankColor = computed(() => RANK_COLORS[props.rank] || '#9B9A97')
</script>

<style scoped>
.case-card {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: all var(--transition-base);
  cursor: pointer;
}
.case-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2rpx); }
.case-card:active { transform: translateY(0) scale(0.99); }
.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72rpx;
  padding: 24rpx 16rpx;
  font-family: var(--font-mono);
  font-size: 32rpx;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.card-content {
  flex: 1;
  padding: 32rpx 28rpx 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}
.card-title {
  font-family: var(--font-display);
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.35;
  margin-bottom: 12rpx;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-tags {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}
.score-inline { font-family: var(--font-mono); font-size: 30rpx; font-weight: 700; color: var(--color-gold); margin-right: 4rpx; }
.tag-pill { display: inline-block; padding: 8rpx 20rpx; border-radius: 9999px; font-size: 22rpx; font-weight: 600; }
.tag-source { background: var(--color-bg); color: var(--color-secondary); border: 1px solid var(--color-border); }
.card-summary { font-size: 26rpx; color: var(--color-secondary); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
</style>
