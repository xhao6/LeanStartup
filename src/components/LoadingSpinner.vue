<template>
  <view class="loading-spinner">
    <view class="spinner" />
    <text class="loading-text">加载中...</text>
  </view>
</template>

<script setup lang="ts">
</script>

<style scoped>
.loading-spinner { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 80rpx 0; }
.spinner { width: 48rpx; height: 48rpx; border: 4rpx solid #E8E6E1; border-top-color: #E94560; border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-text { font-size: 24rpx; color: #9B9A97; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
