<!-- src/components/subscribe-banner/index.vue -->
<template>
  <view v-if="showBanner" class="subscribe-banner" @click="handleClick">
    <!-- Shimmer overlay -->
    <view class="shimmer-overlay"></view>

    <!-- Content -->
    <view class="subscribe-content">
      <view class="subscribe-text">
        <text class="subscribe-title">{{ titleText }}</text>
        <text class="subscribe-desc">{{ descText }}</text>
      </view>
      <view class="subscribe-btn">
        <text class="btn-text">{{ btnText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSubscriptionStore } from '@/store/subscription'

const subscriptionStore = useSubscriptionStore()

const isSubscribed = computed(() => subscriptionStore.isSubscribed)
const loading = computed(() => subscriptionStore.loading)

const showBanner = computed(() => true)

const titleText = computed(() => {
  return isSubscribed.value ? '已授权订阅' : '订阅每日提醒'
})

const descText = computed(() => {
  return isSubscribed.value
    ? '下次榜单更新时将收到通知'
    : '第一时间收到最新 TOP3 推送'
})

const btnText = computed(() => {
  return isSubscribed.value ? '已订阅' : '立即订阅'
})

const handleClick = async () => {
  if (loading.value) return

  if (isSubscribed.value) {
    showManageOptions()
  } else {
    await handleSubscribe()
  }
}

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
      uni.showToast({ title: '已取消订阅', icon: 'none' })
    } else {
      uni.showToast({ title: err.message || '订阅失败', icon: 'none' })
    }
  }
}

const showManageOptions = () => {
  uni.showActionSheet({
    itemList: ['查看订阅状态', '取消订阅'],
    success: async (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: '订阅状态：已订阅', icon: 'success' })
      } else if (res.tapIndex === 1) {
        await handleUnsubscribe()
      }
    }
  })
}

const handleUnsubscribe = async () => {
  try {
    await subscriptionStore.doUnsubscribe()
    uni.showToast({ title: '已取消订阅', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '取消失败', icon: 'none' })
  }
}

onMounted(async () => {
  try {
    await subscriptionStore.checkStatus()
  } catch {}
})
</script>

<style scoped>
.subscribe-banner {
  background: linear-gradient(135deg, #E94560 0%, #FF6B8A 50%, #F5A623 100%);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.25);
  position: relative;
  overflow: hidden;
  margin: 0 15px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.subscribe-banner:active {
  opacity: 0.9;
}

/* Shimmer animation overlay */
.shimmer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
  animation: shimmer 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.subscribe-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.subscribe-text {
  flex: 1;
}

.subscribe-title {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: white;
  margin-bottom: 3px;
}

.subscribe-desc {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.subscribe-btn {
  background: white;
  border-radius: 12px;
  padding: 10px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.btn-text {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #E94560;
}
</style>
