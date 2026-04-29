<template>
  <view class="pitfall-warning">
    <view class="warning-header">
      <svg class="warning-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
      </svg>
      <text class="warning-label">⚠️ 避坑指南</text>
    </view>
    <text class="warning-text">{{ content }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{ content: string }>()
</script>

<style lang="scss" scoped>
.pitfall-warning {
  background: #FFF3E0;
  border: 1rpx solid #FFE0B2;
  border-radius: 12rpx;
  padding: 20rpx;
}
.warning-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}
.warning-icon {
  width: 20rpx;
  height: 20rpx;
  color: #E65100;
  flex-shrink: 0;
}
.warning-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #E65100;
}
.warning-text {
  font-size: 32rpx;
  color: #BF360C;
  line-height: 1.6;
}
</style>
