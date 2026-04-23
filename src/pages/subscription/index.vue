<template>
  <view class="min-h-screen" style="background-color: #FAFAF8">
    <!-- Header -->
    <view class="pt-12 pb-6 px-4">
      <text class="font-bold" style="font-size: 24px; color: #1A1A2E; font-family: 'Noto Serif SC', serif">
        订阅管理
      </text>
      <text class="mt-2" style="font-size: 14px; color: #4A4A68">
        管理你的每日精选推送通知
      </text>
    </view>

    <!-- Status Card -->
    <view
      class="mx-4 p-5"
      style="background: #fff; border-radius: 12px; border: 1px solid #E8E6E1; box-shadow: 0 2px 12px rgba(26,26,46,0.06)"
    >
      <view class="flex items-center">
        <view
          class="flex items-center justify-center mr-4"
          style="width: 48px; height: 48px; border-radius: 24px"
          :style="{ background: subscriptionStore.isSubscribed ? 'rgba(5,150,105,0.1)' : 'rgba(155,154,151,0.1)' }"
        >
          <text style="font-size: 24px">{{ subscriptionStore.isSubscribed ? '\u{1F514}' : '\u{1F51A}' }}</text>
        </view>
        <view class="flex-1">
          <text class="font-bold" style="font-size: 16px; color: #1A1A2E">
            {{ subscriptionStore.isSubscribed ? '已开启订阅' : '未开启订阅' }}
          </text>
          <text class="mt-1" style="font-size: 13px; color: #9B9A97">
            {{ subscriptionStore.isSubscribed ? '每日精选案例将推送给你' : '开启后接收每日精选推送' }}
          </text>
        </view>
      </view>

      <!-- Subscribe/Unsubscribe Button -->
      <view class="mt-4">
        <view
          class="flex items-center justify-center"
          style="min-height: 44px; border-radius: 9999px"
          :style="{
            background: subscriptionStore.isSubscribed ? '#fff' : 'linear-gradient(135deg, #E94560, #FF6B8A)',
            border: subscriptionStore.isSubscribed ? '1.5px solid #E8E6E1' : 'none'
          }"
          @tap="handleToggle"
        >
          <text
            style="font-size: 15px; font-weight: 600"
            :style="{ color: subscriptionStore.isSubscribed ? '#E94560' : '#fff' }"
          >
            {{ subscriptionStore.loading ? '处理中...' : (subscriptionStore.isSubscribed ? '取消订阅' : '立即订阅') }}
          </text>
        </view>
      </view>
    </view>

    <!-- Info Section -->
    <view class="mx-4 mt-4 p-5" style="background: #fff; border-radius: 12px; border: 1px solid #E8E6E1">
      <text class="font-bold" style="font-size: 15px; color: #1A1A2E">订阅须知</text>
      <view class="mt-3">
        <view v-for="(point, idx) in infoPoints" :key="idx" class="flex items-start mt-3">
          <view
            class="flex items-center justify-center mr-3 mt-0.5"
            style="width: 6px; height: 6px; border-radius: 3px; background: #E94560"
          />
          <text style="font-size: 14px; color: #4A4A68; line-height: 1.5">{{ point }}</text>
        </view>
      </view>
    </view>

    <!-- Notification History (placeholder) -->
    <view class="mx-4 mt-4 p-5 mb-6" style="background: #fff; border-radius: 12px; border: 1px solid #E8E6E1">
      <text class="font-bold" style="font-size: 15px; color: #1A1A2E">通知记录</text>
      <view class="flex flex-col items-center py-8">
        <text style="font-size: 32px; color: #E8E6E1">\u{263A}</text>
        <text class="mt-3" style="font-size: 14px; color: #9B9A97">暂无通知记录</text>
        <text class="mt-1" style="font-size: 12px; color: #9B9A97">订阅后推送的通知将显示在这里</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useSubscriptionStore } from '@/store'
import { useLogin } from '@/composables/useLogin'
import { SUBSCRIBE_TEMPLATE_ID } from '@/utils/constants'

const subscriptionStore = useSubscriptionStore()
const { ensureLoggedIn } = useLogin()

const infoPoints = ref([
  '每日早上 9:00 推送当天精选案例',
  '每次推送包含 3 个 AI 筛选的高价值副业案例',
  '可在微信服务通知中查看推送内容',
  '随时可以取消订阅，不会影响其他功能使用'
])

async function handleToggle() {
  if (subscriptionStore.loading) return

  if (subscriptionStore.isSubscribed) {
    // Unsubscribe flow: confirm then unsubscribe
    uni.showModal({
      title: '取消订阅',
      content: '确定要取消每日精选推送吗？',
      confirmText: '确定取消',
      confirmColor: '#E94560',
      success: async (res) => {
        if (res.confirm) {
          const result = await subscriptionStore.unsubscribe()
          uni.showToast({
            title: result.message,
            icon: result.success ? 'success' : 'none'
          })
        }
      }
    })
  } else {
    // Subscribe flow: requestSubscribeMessage -> ensureLoggedIn -> subscribe
    try {
      await wx.requestSubscribeMessage({
        tmplIds: [SUBSCRIBE_TEMPLATE_ID],
        success: async (res: any) => {
          if (res[SUBSCRIBE_TEMPLATE_ID] === 'accept') {
            const loggedIn = await ensureLoggedIn()
            if (!loggedIn) return

            const result = await subscriptionStore.subscribe()
            uni.showToast({
              title: result.message,
              icon: result.success ? 'success' : 'none'
            })
          } else {
            uni.showToast({ title: '需要授权通知才能订阅', icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '授权失败，请重试', icon: 'none' })
        }
      })
    } catch {
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
  }
}

onShow(() => {
  subscriptionStore.checkStatus()
})
</script>
