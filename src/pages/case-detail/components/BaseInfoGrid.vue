<template>
  <view class="base-info-grid">
    <view class="info-item">
      <svg class="info-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a4.265 4.265 0 01-.264-.521H10a1 1 0 100-2H8.017a7.36 7.36 0 010-1H10a1 1 0 100-2H8.472a4.265 4.265 0 01.264-.521z"/>
      </svg>
      <view class="info-content">
        <text class="info-label">启动成本</text>
        <text class="info-value">{{ caseData.cost }}</text>
      </view>
    </view>
    <view class="info-item">
      <svg class="info-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/>
      </svg>
      <view class="info-content">
        <text class="info-label">预期收益</text>
        <text class="info-value">{{ caseData.expected_revenue }}</text>
      </view>
    </view>
    <view class="info-item">
      <svg class="info-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
      </svg>
      <view class="info-content">
        <text class="info-label">变现周期</text>
        <text class="info-value">{{ caseData.cycle }}</text>
      </view>
    </view>
    <view class="info-item">
      <svg class="info-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
      </svg>
      <view class="info-content">
        <text class="info-label">适合人群</text>
        <text class="info-value">{{ caseData.suitable_for }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ caseData: any }>()
</script>

<style lang="scss" scoped>
.base-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 0 32rpx;
}
.info-item {
  background: #FFFFFF;
  border: 1rpx solid #E8E6E1;
  border-radius: 12rpx;
  padding: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.info-icon {
  width: 24rpx;
  height: 24rpx;
  color: #E94560;
  flex-shrink: 0;
}
.info-content {
  flex: 1;
}
.info-label {
  font-size: 24rpx;
  color: #9B9A97;
  display: block;
  margin-bottom: 4rpx;
}
.info-value {
  font-size: 30rpx;
  color: #1A1A2E;
  font-weight: 700;
}
</style>
