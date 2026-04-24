<template>
  <view class="subscribe-banner" @click="handleClick">
    <view class="banner-content">
      <wd-icon name="bell" size="18px" color="#FFFFFF" />
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
  margin: 24rpx 32rpx;
  background: linear-gradient(135deg, #1A1A2E 0%, #2D2D44 100%);
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.banner-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.banner-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

.banner-cta {
  background: #E94560;
  color: #FFFFFF;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}
</style>
