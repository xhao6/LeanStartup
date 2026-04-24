<template>
  <view class="fixed-action-bar">
    <button class="action-btn" @click="onShare">
      <wd-icon name="share" size="18px" />
      <text>分享</text>
    </button>
    <button class="action-btn" @click="$emit('toggle-favorite')">
      <wd-icon :name="isFavorited ? 'star-fill' : 'star'" size="18px" />
      <text>收藏</text>
    </button>
    <button class="action-btn" @click="onSaveImage">
      <wd-icon name="image" size="18px" />
      <text>存图</text>
    </button>
  </view>
</template>

<script setup lang="ts">
defineProps<{ caseId: string; isFavorited: boolean }>()
defineEmits<{ 'toggle-favorite': []; share: [] }>()
const onShare = () => uni.share({ type: 0 })
const onSaveImage = () => {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.fixed-action-bar {
  position: fixed; bottom: 0; left: 0; right: 0; height: 120rpx;
  background: #FFFFFF; border-top: 1rpx solid #E8E6E1;
  display: flex; justify-content: center; align-items: center; gap: 120rpx;
  padding-bottom: env(safe-area-inset-bottom);
}
.action-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4rpx;
  font-size: 22rpx; color: #4A4A68; background: none;
  &.active { color: #E94560; }
}
</style>