<template>
  <view v-if="content" class="story-section">
    <view class="story-header">
      <svg class="story-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zm-1-9a.5.5 0 011 0v3.5a.5.5 0 01-1 0V7.5zm.5 5.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
      </svg>
      <text class="story-label">案例故事</text>
    </view>
    <text class="story-content">{{ content }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{ content?: string }>()
</script>

<style lang="scss" scoped>
.story-section {
  background: #FFF5F7;
  border: 1rpx solid #FADADD;
  border-radius: 24rpx;
  padding: 24rpx;
  margin: 0 32rpx;
}
.story-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}
.story-icon {
  width: 20rpx;
  height: 20rpx;
  color: #E94560;
  flex-shrink: 0;
}
.story-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #E94560;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.story-content {
  font-size: 30rpx;
  color: #4A4A68;
  line-height: 1.7;
}
</style>
