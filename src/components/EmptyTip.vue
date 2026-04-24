<template>
  <view class="empty-tip">
    <text class="empty-icon">📭</text>
    <text class="empty-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{ text?: string }>()
</script>

<style scoped>
.empty-tip { display: flex; flex-direction: column; align-items: center; gap: 16rpx; padding: 80rpx 0; }
.empty-icon { font-size: 80rpx; opacity: 0.5; }
.empty-text { font-size: 28rpx; color: #9B9A97; }
</style>
