<template>
  <view class="risk-tags">
    <view v-for="tag in tags" :key="tag" class="risk-tag">{{ tag }}</view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ tags: string[] }>()
</script>

<style lang="scss" scoped>
.risk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 32rpx 32rpx;
}
.risk-tag {
  background: #FEE2E2;
  color: #DC2626;
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 24rpx;
  border-radius: 999rpx;
}
</style>
