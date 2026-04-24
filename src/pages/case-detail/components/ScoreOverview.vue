<template>
  <view class="score-overview">
    <view class="score-main">
      <text class="score-number">{{ caseData.score_total }}</text>
      <text class="score-max">/10</text>
    </view>
    <view class="score-dimensions">
      <view class="dim-item">
        <text class="dim-label">落地可行性</text>
        <wd-progress :percentage="(caseData.score_feasibility / 3) * 100" color="#E94560" hide-text />
        <text class="dim-value">{{ caseData.score_feasibility }}/3</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">收益潜力</text>
        <wd-progress :percentage="(caseData.score_profit / 2) * 100" color="#F5A623" hide-text />
        <text class="dim-value">{{ caseData.score_profit }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">时效性</text>
        <wd-progress :percentage="(caseData.score_timeliness / 2) * 100" color="#4A90D9" hide-text />
        <text class="dim-value">{{ caseData.score_timeliness }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">实操细节</text>
        <wd-progress :percentage="(caseData.score_detail / 2) * 100" color="#3D5C3D" hide-text />
        <text class="dim-value">{{ caseData.score_detail }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">用户适配度</text>
        <wd-progress :percentage="(caseData.score_fitness / 1) * 100" color="#9B9A97" hide-text />
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
  background: linear-gradient(135deg, #1A1A2E 0%, #2D2D44 100%);
  padding: 48rpx 32rpx;
  border-radius: 0 0 32rpx 32rpx;
}
.score-main { display: flex; align-items: baseline; justify-content: center; margin-bottom: 40rpx; }
.score-number { font-family: 'Roboto Mono', monospace; font-size: 96rpx; font-weight: 700; color: #F5A623; }
.score-max { font-family: 'Roboto Mono', monospace; font-size: 36rpx; color: rgba(255,255,255,0.5); margin-left: 8rpx; }
.score-dimensions { display: flex; flex-direction: column; gap: 20rpx; }
.dim-item { display: grid; grid-template-columns: 140rpx 1fr 80rpx; align-items: center; gap: 16rpx; }
.dim-label { font-size: 24rpx; color: rgba(255,255,255,0.7); }
.dim-value { font-family: 'Roboto Mono', monospace; font-size: 24rpx; color: rgba(255,255,255,0.9); text-align: right; }
</style>