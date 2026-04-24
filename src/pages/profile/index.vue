<!-- src/pages/profile/index.vue -->
<route lang="json">
{
  "layout": "tabbar",
  "style": {
    "navigationBarTitleText": "我的"
  }
}
</route>

<template>
  <view class="profile-page min-h-screen" style="background: #FAFAF8;">
    <!-- Header -->
    <view class="profile-header">
      <!-- Decorative circles -->
      <view class="deco-circle deco-circle-1"></view>
      <view class="deco-circle deco-circle-2"></view>

      <view class="user-info" @click="handleLogin">
        <view class="avatar-wrapper">
          <image
            :src="userInfo?.avatar || '/static/images/placeholder-avatar.png'"
            class="avatar"
            mode="aspectFill"
          />
        </view>
        <view class="user-text">
          <template v-if="isLoggedIn">
            <text class="user-name">{{ userInfo?.name || '用户' }}</text>
            <view class="user-id-row">
              <text class="user-id">已登录</text>
            </view>
          </template>
          <template v-else>
            <text class="user-name">点击登录</text>
            <text class="user-id">登录同步收藏数据</text>
          </template>
        </view>
      </view>
    </view>

    <!-- Stats Card -->
    <view class="stats-card-wrapper">
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ viewedCount }}</text>
          <text class="stat-label">已阅榜单</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goToFavorites">
          <text class="stat-value">{{ favoritesCount }}</text>
          <text class="stat-label">我的收藏</text>
        </view>
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-section">
      <view class="menu-card">
        <view class="menu-item" @click="goToSubscription">
          <text class="menu-icon">🔔</text>
          <text class="menu-title">订阅管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToFavorites">
          <text class="menu-icon">⭐</text>
          <text class="menu-title">我的收藏</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <button class="menu-item share-btn" open-type="share">
          <text class="menu-icon">📤</text>
          <text class="menu-title">转发给朋友</text>
          <text class="menu-arrow">›</text>
        </button>
        <view class="menu-divider"></view>
        <button class="menu-item contact-btn" open-type="contact">
          <text class="menu-icon">💬</text>
          <text class="menu-title">联系客服</text>
          <text class="menu-arrow">›</text>
        </button>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToAgreement">
          <text class="menu-icon">📄</text>
          <text class="menu-title">用户协议</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToPrivacy">
          <text class="menu-icon">🔒</text>
          <text class="menu-title">隐私政策</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="handleClearCache">
          <text class="menu-icon">🗑</text>
          <text class="menu-title">清除缓存</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-title">关于精益副业案例库</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view v-if="isLoggedIn" class="logout-section">
        <view class="logout-btn" @click="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref, computed } from 'vue'
import { useUserStore } from '@/store'
import { useCollectionStore } from '@/store/collection'
import { CacheService } from '@/services/CacheService'
import { useShare } from '@/composables/useShare'
import appConfig from '@/config/app.config'

useShare({
  title: `${appConfig.appName} - 个人中心`,
  path: '/pages/profile/index'
})

const userStore = useUserStore()
const collectionStore = useCollectionStore()
const userInfo = computed(() => userStore.userInfo)
const isLoggedIn = computed(() => userStore.isLoggedIn)

const viewedCount = computed(() => userStore.viewedCount)
const favoritesCount = computed(() => collectionStore.collections.length)

onShow(() => {
  refreshData()
})

const refreshData = () => {
  if (isLoggedIn.value) {
    collectionStore.refresh()
  }
}

const handleLogin = async () => {
  if (isLoggedIn.value) return

  uni.showLoading({ title: '登录中...', mask: true })
  try {
    userStore.setUser({ id: 'wechat_user', name: '微信用户' })
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (e) {
    console.error('登录失败:', e)
    uni.showToast({ title: '登录失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const handleLogout = () => {
  userStore.logout()
  uni.showToast({ title: '已退出', icon: 'none' })
}

const goToFavorites = () => {
  uni.navigateTo({ url: '/pages/profile/favorites/index' })
}

const goToSubscription = () => {
  uni.navigateTo({ url: '/pages/profile/subscription/index' })
}

const goToAgreement = () => {
  uni.navigateTo({ url: '/pages/profile/agreement/index' })
}

const goToPrivacy = () => {
  uni.navigateTo({ url: '/pages/profile/privacy/index' })
}

const goToAbout = () => {
  uni.navigateTo({ url: '/pages/profile/about/index' })
}

const handleClearCache = () => {
  CacheService.confirmAndClear()
}
</script>

<style scoped>
.profile-page {
  padding-bottom: 100px;
}

/* Header */
.profile-header {
  background: #1A1A2E;
  padding: 48px 32px 64px;
  position: relative;
  overflow: hidden;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

.deco-circle-1 {
  right: -40px;
  top: -40px;
  width: 160px;
  height: 160px;
}

.deco-circle-2 {
  left: 40px;
  bottom: 0;
  width: 80px;
  height: 80px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #FFFFFF;
}

.user-text {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.user-id-row {
  margin-top: 4px;
}

.user-id {
  display: inline-block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 9999px;
}

/* Stats Card */
.stats-card-wrapper {
  padding: 0 16px;
  margin-top: -32px;
  position: relative;
  z-index: 20;
}

.stats-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
  padding: 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #9B9A97;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #E8E6E1;
}

/* Menu Section */
.menu-section {
  padding: 16px;
}

.menu-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 18px;
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 16px;
}

.menu-item::after {
  border: none;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.menu-title {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  color: #1A1A2E;
}

.menu-arrow {
  font-size: 18px;
  color: #9B9A97;
}

.menu-divider {
  height: 1px;
  background: #E8E6E1;
  margin: 0 18px;
}

.share-btn, .contact-btn {
  margin: 0;
  padding: 16px 18px;
  background: transparent;
  border: none;
  line-height: normal;
}

.share-btn::after, .contact-btn::after {
  border: none;
}

/* Logout */
.logout-section {
  margin-top: 16px;
}

.logout-btn {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.logout-btn:active {
  opacity: 0.85;
}

.logout-text {
  font-size: 16px;
  font-weight: 500;
  color: #E94560;
}
</style>
