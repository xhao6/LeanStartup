<!-- src/components/case-card/index.vue -->
<template>
  <view class="case-card" :class="`rank-${rank}`" @click="handleClick">
    <!-- 排名数字 -->
    <view :class="['rank-number', `rank-${rank}`]">
      <text class="rank-text">{{ rankText }}</text>
    </view>

    <!-- 内容区 -->
    <view class="rank-content">
      <!-- 案例名 + 评分内联 -->
      <view class="case-name-row">
        <text class="case-score-inline">{{ caseData.score_total }}★</text>
        <text class="case-name">{{ caseData.title }}</text>
      </view>

      <!-- 描述 -->
      <view v-if="caseData.summary" class="description-row">
        <text class="description">{{ caseData.summary }}</text>
      </view>

      <!-- 标签 -->
      <view class="tags-row">
        <view v-if="caseData.cost" class="tag-item tag-cost">
          <text class="tag-text">{{ caseData.cost }}</text>
        </view>
        <view v-if="caseData.tags && caseData.tags.length > 0" class="tag-item tag-source">
          <text class="tag-text">{{ caseData.tags[0] }}</text>
        </view>
        <view v-if="caseData.cycle" class="tag-item tag-time">
          <text class="tag-text">{{ caseData.cycle }}</text>
        </view>
      </view>
    </view>

    <!-- 箭头 -->
    <view class="rank-arrow">
      <text class="arrow-icon">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DailyCase } from '@/api/modules/daily'

interface Props {
  caseData: DailyCase
  rank: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: [caseData: DailyCase]
}>()

const rankText = computed(() => String(props.rank))

const handleClick = () => emit('click', props.caseData)
</script>

<style scoped>
/* 悬浮式圆角卡片 */
.case-card {
  display: flex;
  align-items: stretch;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03);
  border: 1px solid #E8E6E1;
  overflow: hidden;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.case-card:active {
  transform: translateY(0) scale(0.99);
  background: #F8F8F6;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06), 0 2px 10px rgba(0, 0, 0, 0.04);
}

/* 排名数字 - 左侧徽章 */
.rank-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 12px 8px;
  font-family: 'Roboto Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  color: white;
  background: #E8E6E1;
  border-radius: 16px 0 0 16px;
  position: relative;
  flex-shrink: 0;
}

/* #01 - 金橙渐变 */
.rank-1 .rank-number {
  background: linear-gradient(180deg, #FBBF24 0%, #F97316 100%);
}

/* #02 - 银灰渐变 */
.rank-2 .rank-number {
  background: linear-gradient(180deg, #94A3B8 0%, #64748B 100%);
}

/* #03 - 铜棕渐变 */
.rank-3 .rank-number {
  background: linear-gradient(180deg, #D4A574 0%, #B8956C 100%);
}

.rank-text {
  color: white;
}

/* 内容区 */
.rank-content {
  flex: 1;
  padding: 16px 14px 16px 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

/* 案例名行（包含内联评分） */
.case-name-row {
  margin-bottom: 6px;
  position: relative;
  padding-left: 0;
}

.case-score-inline {
  font-family: 'Roboto Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #F5A623;
  display: inline-block;
  vertical-align: baseline;
}

.case-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 700;
  color: #1A1A2E;
  line-height: 1.35;
  display: inline;
  /* 换行缩进技巧：给标题一个缩进，然后用负margin把第一行拉回来 */
  padding-left: 50px;
  text-indent: -50px;
}

/* 描述 */
.description-row {
  margin-bottom: 10px;
}

.description {
  font-size: 13px;
  color: #4A4A68;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 标签 */
.tags-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow: hidden;
}

.tag-item {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Noto Sans SC', sans-serif;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.tag-text {
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

.tag-cost { background: #D1FAE5; color: #059669; }
.tag-source { background: #FAFAF8; color: #4A4A68; border: 1px solid #E8E6E1; }
.tag-time { background: #DBEAFE; color: #2563EB; }

/* 右侧箭头 */
.rank-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  color: #9B9A97;
  font-size: 20px;
  border-radius: 0 16px 16px 0;
  flex-shrink: 0;
}

.arrow-icon {
  color: inherit;
}
</style>
