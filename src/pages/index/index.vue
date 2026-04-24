<template>
  <view class="index-page">
    <!-- Hero 区域 -->
    <HeroSection />

    <!-- 今日精选 -->
    <DailyPickSection />

    <!-- 订阅横幅 -->
    <SubscribeBanner />
  </view>
</template>

<script setup lang="ts">
import HeroSection from './components/HeroSection.vue'
import DailyPickSection from './components/DailyPickSection.vue'
import SubscribeBanner from '@/components/subscribe-banner/index.vue'
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background: var(--color-bg);
}
</style>