<template>
  <view class="fixed-action-bar">
    <button class="action-btn secondary" @click="onSaveImage">
      <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3a.75.75 0 01.75.75v5.69l1.28-1.28a.75.75 0 111.06 1.06l-2.5 2.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06l1.28 1.28V3.75A.75.75 0 0110 3zM3.75 15a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.5a.75.75 0 01-.75-.75z"/>
      </svg>
      <text>存为图片</text>
    </button>
    <button class="action-btn secondary" @click="onShare">
      <wd-icon name="share" size="16px" />
      <text>分享</text>
    </button>
    <button class="action-btn primary" @click="$emit('toggle-favorite')">
      <wd-icon :name="isFavorited ? 'star-fill' : 'star'" size="16px" custom-class="fill-1" />
      <text>收藏</text>
    </button>
  </view>
</template>

<script setup lang="ts">
defineProps<{ caseId: string; isFavorited: boolean }>()
defineEmits<{ 'toggle-favorite': []; share:[] }>()
const onShare = () => {
  // 分享功能
  uni.showActionSheet({
    itemList: ['转发给朋友', '生成海报'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.share({ type: 0 })
      } else if (res.tapIndex === 1) {
        uni.showToast({ title: '海报生成中', icon: 'loading' })
      }
    }
  })
}
const onSaveImage = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.fixed-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 1rpx solid #E8E6E1;
  z-index: 100;
}
.action-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 72rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  border: none;
  padding: 0;
  margin: 0;
  &.secondary {
    flex: 1;
    background: #FAFAF8;
    color: #1A1A2E;
    border: 0.5rpx solid #E8E6E1;
  }
  &.primary {
    flex: 1.2;
    background: linear-gradient(135deg, #E94560, #FF6B8A);
    color: #FFFFFF;
    box-shadow: 0 2rpx 12rpx rgba(233, 69, 96, 0.2);
  }
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}
.btn-icon {
  width: 20rpx;
  height: 20rpx;
}
</style>
