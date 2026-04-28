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
            <view class="user-name-row">
              <text class="user-name">{{ userInfo?.name || '用户' }}</text>
              <wd-icon v-if="isLoggedIn" name="edit" size="16px" class="edit-icon" @click.stop="handleEditNickname" />
            </view>
            <view class="user-id-row">
              <text class="user-id">ID: {{ userInfo?.id ? userInfo.id.substring(0, 8) : '...' }}</text>
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
        <wd-cell-group border>
          <wd-cell title="订阅管理" is-link icon="setting" @click="goToSubscription" />
          <wd-cell title="我的收藏" is-link icon="star" @click="goToFavorites" />
          <button class="share-btn" open-type="share">
            <wd-cell title="转发给朋友" is-link icon="share" />
          </button>
          <button class="contact-btn" open-type="contact">
            <wd-cell title="联系客服" is-link icon="service" />
          </button>
          <wd-cell title="用户协议" is-link icon="file" @click="goToAgreement" />
          <wd-cell title="隐私政策" is-link icon="lock-on" @click="goToPrivacy" />
          <wd-cell title="清除缓存" is-link icon="delete" @click="handleClearCache" />
          <wd-cell title="关于..." is-link icon="info-circle" @click="goToAbout" />
        </wd-cell-group>
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
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store'
import { CacheService } from '@/services/CacheService'
import { useBackButtonRedirect } from '@/composables/useBackButtonRedirect'
import { useShare } from '@/composables/useShare'
import { getFavoritesCount } from '@/utils/favorites'
import { fullSyncFavorites } from '@/utils/syncFavorites'
import appConfig from '@/config/app.config'

// 拦截返回键，跳转到首页
useBackButtonRedirect('/pages/index/index')

// 启用分享功能
useShare({
  title: `${appConfig.appName} - 个人中心`,
  path: '/pages/profile/index'
})

const userStore = useUserStore()
const { userInfo, isLoggedIn } = storeToRefs(userStore)

// 收藏数量
const favoritesCount = ref(getFavoritesCount())
const viewedCount = computed(() => userInfo.value?.viewedRankingsCount || 0)

onShow(() => {
  // 每次页面显示时刷新收藏数量
  favoritesCount.value = getFavoritesCount()
  if (isLoggedIn.value) {
    userStore.fetchProfile()
  }
})

const handleLogin = async () => {
  if (isLoggedIn.value) return

  uni.showLoading({ title: '登录中...', mask: true })

  try {
    let wechatUserInfo = null

    // #ifdef MP-WEIXIN
    try {
      wechatUserInfo = await new Promise<any>((resolve) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res: any) => {
            resolve(res.userInfo)
          },
          fail: (err: any) => {
            console.log('[Login] 用户拒绝授权:', err)
            uni.showToast({
              title: '需要授权才能完善资料',
              icon: 'none'
            })
            resolve(null)
          }
        })
      })
    } catch (e) {
      console.log('获取授权失败，继续登录:', e)
    }
    // #endif

    await userStore.login(wechatUserInfo)
    // 登录后等待收藏同步完成再刷新数量
    await fullSyncFavorites().catch((err) => {
      console.error('[Login] 收藏同步失败:', err)
    })
    favoritesCount.value = getFavoritesCount()
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
  favoritesCount.value = 0
  uni.showToast({ title: '已退出', icon: 'none' })
}

// 修改昵称
const handleEditNickname = () => {
  uni.showModal({
    title: '修改昵称',
    editable: true,
    placeholderText: '请输入新昵称',
    content: userInfo.value?.name || '',
    success: async (res) => {
      if (res.confirm && res.content) {
        const newName = res.content.trim()
        if (!newName) {
          uni.showToast({ title: '昵称不能为空', icon: 'none' })
          return
        }
        if (newName.length > 20) {
          uni.showToast({ title: '昵称不能超过20个字符', icon: 'none' })
          return
        }

        uni.showLoading({ title: '保存中...', mask: true })
        const result = await userStore.updateUserInfo({ name: newName })
        uni.hideLoading()

        if (result.success) {
          uni.showToast({ title: '修改成功', icon: 'success' })
        } else {
          uni.showToast({ title: result.error || '修改失败', icon: 'none' })
        }
      }
    }
  })
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

.user-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.user-name {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.edit-icon {
  opacity: 0.7;
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
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.share-btn {
  width: 100%;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  text-align: left;
}
.share-btn::after {
  border: none;
}

.contact-btn {
  width: 100%;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  text-align: left;
}
.contact-btn::after {
  border: none;
}

:deep(.wd-cell-group) {
  background-color: transparent !important;
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
