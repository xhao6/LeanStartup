<template>
  <view class="min-h-screen" style="background-color: #FAFAF8">
    <!-- Header with gradient -->
    <view
      class="pt-16 pb-8 flex flex-col items-center"
      style="background: linear-gradient(180deg, #2D2D44 0%, #1A1A2E 100%)"
    >
      <!-- Avatar -->
      <view
        class="flex items-center justify-center mb-3"
        style="width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.2)"
        @tap="handleLogin"
      >
        <text style="font-size: 28px">😊</text>
      </view>
      <!-- Login text / nickname -->
      <text
        v-if="!isLoggedIn"
        class="text-white font-bold"
        style="font-size: 18px"
        @tap="handleLogin"
      >点击登录</text>
      <text
        v-else
        class="text-white font-bold"
        style="font-size: 18px"
      >已登录</text>
      <text
        class="mt-1"
        style="font-size: 13px; color: rgba(255,255,255,0.5)"
      >{{ isLoggedIn ? '欢迎回来' : '登录同步收藏数据' }}</text>
    </view>

    <!-- Stats card -->
    <view
      class="mx-4 flex overflow-hidden"
      style="margin-top: -16px; background: #fff; border-radius: 12px; border: 1px solid #E8E6E1; box-shadow: 0 1px 3px rgba(0,0,0,0.06)"
    >
      <view
        class="flex-1 py-4 flex flex-col items-center"
        @tap="goToHistory"
      >
        <text class="font-bold" style="font-size: 24px; color: #1A1A2E">{{ stats.readCount }}</text>
        <text class="mt-1" style="font-size: 14px; color: #4A4A68">已阅榜单</text>
      </view>
      <view style="width: 1px; background: #E8E6E1"></view>
      <view
        class="flex-1 py-4 flex flex-col items-center"
        @tap="goToFavorites"
      >
        <text class="font-bold" style="font-size: 24px; color: #1A1A2E">{{ stats.collectionCount }}</text>
        <text class="mt-1" style="font-size: 14px; color: #4A4A68">我的收藏</text>
      </view>
    </view>

    <!-- Menu card -->
    <view
      class="mx-4 mt-4 overflow-hidden"
      style="background: #fff; border-radius: 12px; border: 1px solid #E8E6E1"
    >
      <view
        v-for="(item, index) in menuItems"
        :key="item.key"
        class="flex items-center"
        :class="{ 'border-b': index < menuItems.length - 1 }"
        style="padding: 16px 18px; border-bottom-color: #E8E6E1; border-bottom-width: 1px; border-bottom-style: solid"
        :style="index === menuItems.length - 1 ? { borderBottom: 'none' } : {}"
        @tap="onMenuTap(item)"
      >
        <text
          class="mr-3"
          style="width: 24px; text-align: center; font-size: 20px; color: #4A4A68"
        >{{ item.icon }}</text>
        <text
          class="flex-1"
          style="font-size: 15px; font-weight: 400; color: #1A1A2E"
        >{{ item.label }}</text>
        <text style="font-size: 14px; color: #9B9A97">›</text>
      </view>
    </view>

    <!-- Version -->
    <view class="flex justify-center mt-8 mb-4">
      <text style="font-size: 12px; color: #9B9A97">精益副业案例库 v1.0.0</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore, useCollectionStore } from '@/store'
import { useLogin } from '@/composables/useLogin'
import { useCache } from '@/composables/useCache'
import { getMenuItems, handleMenuAction, computeStats } from './helpers'

const userStore = useUserStore()
const collectionStore = useCollectionStore()
const { isLoggedIn, ensureLoggedIn } = useLogin()
const { clearCache } = useCache()

const menuItems = getMenuItems()

const stats = computed(() => computeStats(collectionStore.total))

function handleLogin() {
  if (!isLoggedIn.value) {
    ensureLoggedIn()
  }
}

function goToFavorites() {
  uni.navigateTo({ url: '/pages/favorites/index' })
}

function goToHistory() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function onMenuTap(item: ReturnType<typeof getMenuItems>[number]) {
  handleMenuAction(item, {
    navigateTo: (url: string) => uni.navigateTo({ url }),
    showToast: (opts) => uni.showToast(opts),
    clearCache,
    triggerShare: () => uni.showToast({ title: '请使用右上角转发', icon: 'none' }),
    openContact: () => uni.showToast({ title: '功能开发中', icon: 'none' })
  })
}

// Refresh collection count when page shows
onShow(() => {
  if (isLoggedIn.value) {
    collectionStore.fetchCollections(1).catch(() => {})
  }
})
</script>
