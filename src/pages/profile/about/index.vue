<!-- src/pages/profile/about/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": {
    "navigationBarTitleText": "关于"
  }
}
</route>

<template>
  <view class="bg-gray-50 min-h-screen box-border">
    <!-- Logo区域 -->
    <view class="bg-white py-12 px-4 text-center">
      <view class="text-3xl font-bold text-gray-800 mt-4">{{ appConfig.appName }}</view>
      <view class="text-sm text-gray-400 mt-2">发现值得尝试的副业赚钱机会</view>
      <view class="text-xs text-primary font-medium mt-2">v{{ version }}</view>
    </view>

    <!-- 简介 -->
    <view class="p-4">
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">关于我们</view>
        <view class="text-sm text-gray-500 leading-relaxed">
          {{ appConfig.appName }} 是一个专注于副业案例发现和推荐的平台。我们每日精选 3 个可落地的副业赚钱案例，通过多维度评分体系（可行性、利润率、时效性、细节度、匹配度）帮助用户发现真正值得尝试的机会，并提供进度跟踪功能，助您从0到1落地副业项目。
        </view>
      </view>
    </view>

    <!-- 功能特点 -->
    <view class="p-4 pt-0">
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-4">功能特点</view>
        <view class="space-y-4">
          <view class="flex items-start space-x-3">
            <view class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <text class="text-base">📊</text>
            </view>
            <view>
              <view class="text-sm font-medium text-gray-800">每日榜单</view>
              <view class="text-xs text-gray-400 mt-0.5">每日精选副业案例，多维度评分</view>
            </view>
          </view>
          <view class="flex items-start space-x-3">
            <view class="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
              <text class="text-base">⭐</text>
            </view>
            <view>
              <view class="text-sm font-medium text-gray-800">收藏同步</view>
              <view class="text-xs text-gray-400 mt-0.5">收藏感兴趣案例，云端自动同步</view>
            </view>
          </view>
          <view class="flex items-start space-x-3">
            <view class="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <text class="text-base">📈</text>
            </view>
            <view>
              <view class="text-sm font-medium text-gray-800">进度跟踪</view>
              <view class="text-xs text-gray-400 mt-0.5">记录从0到1的落地进度</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 联系方式 -->
    <view class="p-4 pt-0">
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-4">联系我们</view>
        <view class="space-y-3">
          <view class="flex items-center justify-between py-2">
            <view class="flex items-center space-x-2">
              <text class="text-lg">📧</text>
              <text class="text-sm text-gray-600">邮箱</text>
            </view>
            <text class="text-xs text-gray-400">xhaoca@foxmail.com</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部版权 -->
    <view class="p-8 text-center">
      <view class="text-xs text-gray-300">
        © 2026 {{ appConfig.appName }}. All rights reserved.
      </view>
      <view class="text-xs text-gray-300 mt-1">
        最后更新: 2026年4月28日
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import appConfig from '@/config/app.config'

const version = '1.0.0'
</script>

<style scoped>
.text-primary {
  color: #2563EB;
}
</style>
