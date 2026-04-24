<template>
  <view class="pitfall-warning">
    <wd-icon name="warning-circle" color="#F5A623" size="20px" />
    <view class="pitfall-content">
      <text class="pitfall-title">避坑指南</text>
      <text class="pitfall-text">{{ content }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<style lang="scss" scoped>
.pitfall-warning {
  margin: 0 32rpx 32rpx; background: #FFF8E6; border: 1rpx solid #F5A623;
  border-radius: 12rpx; padding: 24rpx; display: flex; gap: 16rpx;
}
.pitfall-title { font-size: 28rpx; font-weight: 600; color: #F5A623; display: block; margin-bottom: 8rpx; }
.pitfall-text { font-size: 26rpx; color: #4A4A68; line-height: 1.6; }
</style>