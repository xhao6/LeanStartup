<template>
  <view class="base-info-grid">
    <view class="info-item">
      <text class="info-label">启动成本</text>
      <text class="info-value">{{ caseData.cost }}</text>
    </view>
    <view class="info-item">
      <text class="info-label">预期收益</text>
      <text class="info-value">{{ caseData.expected_revenue }}</text>
    </view>
    <view class="info-item">
      <text class="info-label">变现周期</text>
      <text class="info-value">{{ caseData.cycle }}</text>
    </view>
    <view class="info-item">
      <text class="info-label">适合人群</text>
      <text class="info-value">{{ caseData.suitable_for }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ caseData: any }>()
</script>

<style lang="scss" scoped>
.base-info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rpx;
  background: #E8E6E1; margin: 32rpx; border-radius: 12rpx; overflow: hidden;
}
.info-item { background: #FFFFFF; padding: 24rpx; }
.info-label { font-size: 24rpx; color: #9B9A97; display: block; margin-bottom: 8rpx; }
.info-value { font-size: 28rpx; color: #1A1A2E; font-weight: 500; }
</style>