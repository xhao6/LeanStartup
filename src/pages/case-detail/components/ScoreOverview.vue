<template>
  <view class="score-overview">
    <view class="score-main">
      <text class="score-number">{{ caseData.score_total }}</text>
      <text class="score-max">/10</text>
    </view>
    <view class="score-dimensions">
      <view class="dim-item">
        <text class="dim-label">落地可行性</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${(caseData.score_feasibility / 3) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_feasibility }}/3</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">收益潜力</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${(caseData.score_profit / 2) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_profit }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">时间时效</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${(caseData.score_timeliness / 2) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_timeliness }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">实操细节</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${(caseData.score_detail / 2) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_detail }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">人群适配</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${(caseData.score_fitness / 1) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_fitness }}/1</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{ caseData: any }>()
</script>

<style lang="scss" scoped>
.score-overview {
  background: #FFFFFF;
  border: 1rpx solid #E8E6E1;
  border-radius: 24rpx;
  padding: 24rpx;
  display: flex;
  gap: 24rpx;
  align-items: center;
}
.score-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-width: 104rpx;
  text-align: center;
}
.score-number {
  font-family: 'Roboto Mono', monospace;
  font-size: 56rpx;
  font-weight: 700;
  color: #F5A623;
  line-height: 1;
}
.score-max {
  font-family: 'Roboto Mono', monospace;
  font-size: 22rpx;
  color: #9B9A97;
}
.score-dimensions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.dim-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.dim-label {
  font-size: 28rpx;
  color: #4A4A68;
  width: 112rpx;
  flex-shrink: 0;
}
.dim-track {
  flex: 1;
  height: 6rpx;
  background: #E8E6E1;
  border-radius: 999rpx;
  overflow: hidden;
}
.dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #F5A623, #E94560);
  border-radius: 999rpx;
}
.dim-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 22rpx;
  color: #9B9A97;
  width: 56rpx;
  text-align: right;
  flex-shrink: 0;
}
</style>
