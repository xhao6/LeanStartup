<template>
  <view class="risk-tags">
    <view
      v-for="(tag, index) in tags"
      :key="tag"
      class="risk-tag"
      :style="{ background: getTagColor(index).bg, color: getTagColor(index).text }"
    >
      {{ tag }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { MORANDI_TAGS } from '@/utils/constants'

defineProps<{ tags: string[] }>()

const getTagColor = (index: number) => {
  return MORANDI_TAGS[index % MORANDI_TAGS.length]
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
</style>
