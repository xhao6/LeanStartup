<template>
  <view class="risk-tags">
    <view v-for="tag in tags" :key="tag" class="risk-tag">{{ tag }}</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ tags: string[] }>()
</script>

<style lang="scss" scoped>
.risk-tags { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 32rpx 32rpx; }
.risk-tag { background: #FFEAEA; color: #E94560; font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 20rpx; }
</style>