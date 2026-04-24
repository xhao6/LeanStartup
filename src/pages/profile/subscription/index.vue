<!-- src/pages/profile/subscription/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": {
    "navigationBarTitleText": "订阅管理"
  }
}
</route>

<template>
  <view class="subscription-page min-h-screen" style="background: #FAFAF8;">
    <!-- 订阅状态卡片 -->
    <view class="status-card">
      <view class="status-header">
        <view :class="['status-icon', isSubscribed ? 'subscribed' : 'unsubscribed']">
          <text class="icon-text">{{ isSubscribed ? '🔔' : '🔕' }}</text>
        </view>
        <view class="status-info">
          <text class="status-title">{{ isSubscribed ? '已订阅' : '未订阅' }}</text>
          <text class="status-desc">{{ statusDesc }}</text>
        </view>
      </view>

      <!-- 订阅详情 -->
      <view v-if="isSubscribed" class="subscription-details">
        <view class="detail-item">
          <text class="detail-label">推送时间</text>
          <text class="detail-value">每天 8:00</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">推送内容</text>
          <text class="detail-value">今日 TOP 3 案例</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section">
      <view
        v-if="!isSubscribed"
        class="action-btn subscribe-btn"
        @click="handleSubscribe"
      >
        <text class="action-btn-text">{{ loading ? '处理中...' : '立即订阅' }}</text>
      </view>
      <view
        v-else
        class="action-btn unsubscribe-btn"
        @click="handleUnsubscribe"
      >
        <text class="action-btn-text unsubscribe-text">{{ loading ? '处理中...' : '取消订阅' }}</text>
      </view>
    </view>

    <!-- 说明信息 -->
    <view class="info-section">
      <text class="info-title">订阅说明</text>
      <view class="info-list">
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">每天上午 8 点准时推送当日榜单</text>
        </view>
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">获取 TOP 3 最热门副业案例推荐</text>
        </view>
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">一次性订阅，每次接收需要授权</text>
        </view>
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">点击订阅即可授权下次推送通知</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useSubscriptionStore } from '@/store/subscription'

const subscriptionStore = useSubscriptionStore()

const isSubscribed = computed(() => subscriptionStore.isSubscribed)
const loading = computed(() => subscriptionStore.loading)

const statusDesc = computed(() => {
  return isSubscribed.value
    ? '授权成功，下次推送时将收到通知'
    : '授权后可在下次榜单更新时收到通知'
})

onShow(async () => {
  if (!subscriptionStore.isSubscribed) {
    try {
      await subscriptionStore.checkStatus({ force: true })
    } catch (err) {
      console.error('Failed to load status:', err)
    }
  }
})

const handleSubscribe = async () => {
  const templateId = '4cTtUI36EsezKm-B17z7lNt8gvWDX_AYRVlXeuOh8Wo'

  try {
    await new Promise<void>((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res: any) => {
          if (res[templateId] === 'accept') {
            resolve()
          } else if (res[templateId] === 'reject') {
            reject(new Error('用户拒绝授权'))
          } else {
            reject(new Error('授权失败'))
          }
        },
        fail: (err: any) => {
          reject(err)
        }
      })
    })

    await subscriptionStore.doSubscribe()
    if (subscriptionStore.isSubscribed) {
      uni.showToast({ title: '订阅成功', icon: 'success' })
    } else {
      uni.showToast({ title: '订阅失败', icon: 'none' })
    }
  } catch (err: any) {
    if (err.errMsg?.includes('requestSubscribeMessage:fail')) {
      uni.showToast({ title: '需要授权才能接收通知', icon: 'none', duration: 2000 })
    } else if (err.message === '用户拒绝授权') {
      uni.showToast({ title: '已取消授权', icon: 'none' })
    } else {
      uni.showToast({ title: err.message || '订阅失败', icon: 'none' })
    }
  }
}

const handleUnsubscribe = async () => {
  uni.showModal({
    title: '取消订阅',
    content: '取消后将不再收到每日推送通知，确定要取消吗？',
    confirmColor: '#E94560',
    success: async (res) => {
      if (res.confirm) {
        try {
          await subscriptionStore.doUnsubscribe()
          uni.showToast({ title: '已取消订阅', icon: 'success' })
        } catch (err: any) {
          uni.showToast({ title: err.message || '取消失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
/* Status Card */
.status-card {
  background: #FFFFFF;
  margin: 16px;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.status-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon.subscribed {
  background: linear-gradient(135deg, #E94560 0%, #FF6B8A 100%);
}

.status-icon.unsubscribed {
  background: #E8E6E1;
}

.icon-text {
  font-size: 28px;
}

.status-info {
  flex: 1;
}

.status-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 4px;
}

.status-desc {
  display: block;
  font-size: 13px;
  color: #9B9A97;
}

/* Subscription Details */
.subscription-details {
  border-top: 1px solid #E8E6E1;
  padding-top: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.detail-label {
  font-size: 14px;
  color: #9B9A97;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A2E;
}

/* Action Section */
.action-section {
  padding: 0 16px;
  margin-bottom: 24px;
}

.action-btn {
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}

.subscribe-btn {
  background: #E94560;
}

.subscribe-btn:active { opacity: 0.85; }

.action-btn-text {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
}

.unsubscribe-btn {
  background: #FFFFFF;
  border: 1px solid #E8E6E1;
}

.unsubscribe-btn:active { opacity: 0.85; }

.unsubscribe-text {
  color: #E94560;
}

/* Info Section */
.info-section {
  background: #FFFFFF;
  margin: 0 16px 16px;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  margin-bottom: 16px;
  display: block;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.info-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E94560;
  margin-top: 6px;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
  font-size: 13px;
  color: #4A4A68;
  line-height: 1.6;
}
</style>
