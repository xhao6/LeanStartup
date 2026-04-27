<template>
  <view class="risk-tags">
    <view
      v-for="(tag, index) in tags"
      :key="tag"
      class="risk-tag"
      :class="getTagClass(index)"
    >
      {{ tag }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { TAG_COLORS } from '@/utils/constants'

defineProps<{ tags: string[] }>()

const getTagClass = (index: number) => {
  return TAG_COLORS[index % TAG_COLORS.length]
}
</script>

<style lang="scss" scoped>
.risk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.risk-tag {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

/* Macaron配标签色系 - 与首页CaseCard一致 */
.tag-pink    { background: #FDF2F8; color: #DB2777; }
.tag-yellow  { background: #FEF3C7; color: #B45309; }
.tag-blue    { background: #DBEAFE; color: #2563EB; }
.tag-green   { background: #D1FAE5; color: #059669; }
.tag-purple  { background: #EDE9FE; color: #7C3AED; }
.tag-mint    { background: #CCFBF1; color: #0D9488; }
.tag-peach   { background: #FFEDD5; color: #EA580C; }
.tag-lavender { background: #E0E7FF; color: #4F46E5; }
.tag-coral   { background: #FFE4E6; color: #E11D48; }
.tag-lemon   { background: #FEF9C3; color: #CA8A04; }
.tag-sky     { background: #E0F2FE; color: #0284C7; }
.tag-rose    { background: #FCE7F3; color: #DB2777; }
.tag-olive   { background: #ECFCCB; color: #65A30D; }
.tag-wine    { background: #FAE8F0; color: #9F1239; }
</style>
