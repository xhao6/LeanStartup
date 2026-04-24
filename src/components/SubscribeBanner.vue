<template>
  <view class="subscribe-banner" @click="handleClick">
    <view class="banner-content">
      <text class="banner-title">订阅每日提醒</text>
      <text class="banner-desc">第一时间收到最新 TOP3 推送</text>
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
  margin: 0 14rpx 16rpx;
  background: linear-gradient(135deg, #E94560 0%, #FF6B8A 50%, #F5A623 100%);
  border-radius: 16rpx;
  padding: 14rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(233,69,96,0.3);
  position: relative;
  overflow: hidden;
}

.banner-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
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
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
  position: relative;
  z-index: 1;
  white-space: nowrap;
}
</style>
