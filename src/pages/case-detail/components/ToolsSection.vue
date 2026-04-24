<template>
  <view class="tools-section">
    <text class="section-title">工具/资源</text>
    <view class="tools-grid">
      <view v-for="tool in tools" :key="tool.name" class="tool-card">
        <text class="tool-name">{{ tool.name }}</text>
        <text class="tool-desc">{{ tool.desc }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ tools: { name: string; desc: string }[] }>()
</script>

<style lang="scss" scoped>
.tools-section { padding: 32rpx; }
.section-title { font-family: 'Noto Serif SC', serif; font-size: 32rpx; font-weight: 600; color: #1A1A2E; display: block; margin-bottom: 16rpx; }
.tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx; }
.tool-card { background: #FFFFFF; border: 1rpx solid #E8E6E1; border-radius: 12rpx; padding: 24rpx; }
.tool-name { font-size: 28rpx; font-weight: 600; color: #1A1A2E; display: block; margin-bottom: 8rpx; }
.tool-desc { font-size: 24rpx; color: #9B9A97; }
</style>