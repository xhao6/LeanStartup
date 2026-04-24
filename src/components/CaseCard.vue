<template>
  <view class="case-card" :class="`rank-${rank}`" @click="emit('click', props.case.id)">
    <view class="rank-badge" :style="{ background: rankColor }">{{ rank }}</view>
    <view class="card-content">
      <text class="card-title">{{ props.case.title }}</text>
      <view class="card-meta">
        <text class="score-inline">★ {{ props.case.score_total }}</text>
        <text class="cost-tag" :style="{ background: costColor.bg, color: costColor.text }">{{ props.case.cost }}</text>
      </view>
      <text class="card-summary">{{ props.case.summary }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RANK_COLORS, MORANDI_TAGS } from '@/utils/constants'

interface CaseItem { id: string; title: string; summary: string; score_total: number; cost: string }
interface Props { case: CaseItem; rank: number }
const props = defineProps<Props>()
const emit = defineEmits<{ click: [id: string] }>()

const rankColor = computed(() => RANK_COLORS[props.rank] || RANK_COLORS[4])
const costColor = computed(() => {
  if (props.case.cost === '零成本') return { bg: '#D1FAE5', text: '#059669' }
  if (props.case.cost === '低门槛') return { bg: '#DBEAFE', text: '#2563EB' }
  return { bg: MORANDI_TAGS[0].bg, color: MORANDI_TAGS[0].text }
})
</script>

<style scoped>
.case-card { display: flex; gap: 12px; background: var(--color-surface); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-card); transition: all var(--transition-base); cursor: pointer; }
.case-card:active { transform: scale(0.99); }
.rank-badge { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; flex-shrink: 0; }
.card-content { flex: 1; min-width: 0; }
.card-title { display: block; font-family: var(--font-display); font-size: 16px; font-weight: 600; line-height: 1.4; margin-bottom: 8px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.score-inline { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--color-gold); }
.cost-tag { padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.card-summary { font-size: 13px; color: var(--color-secondary); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
</style>
