<template>
  <view class="subscribe-banner" @click="handleClick">
    <view class="banner-content">
      <text class="banner-title">订阅每日推送</text>
      <text class="banner-desc">每天早上 9 点，3 个新案例送上门</text>
    </view>
    <view class="banner-cta">立即订阅</view>
  </view>
</template>

<script setup lang="ts">
const handleClick = () => {
  uni.navigateTo({ url: '/pages/profile/subscription/index' })
}
</script>

<style lang="scss" scoped>
.subscribe-banner {
  margin: 0 28rpx 32rpx;
  background: linear-gradient(135deg, #E94560 0%, #FF6B8A 50%, #F5A623 100%);
  border-radius: 16rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  box-shadow: 0 8rpx 40rpx rgba(233,69,96,0.3);
  position: relative;
  overflow: hidden;
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.banner-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.banner-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
}

.banner-cta {
  background: #FFFFFF;
  color: #E94560;
  font-size: 26rpx;
  font-weight: 700;
  padding: 20rpx 36rpx;
  border-radius: 9999rpx;
  flex-shrink: 0;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
}
</style>
