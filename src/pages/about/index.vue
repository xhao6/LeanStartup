<script setup lang="ts">
import appConfig from '@/config/app.config'
</script>

<template>
  <view class="min-h-screen" style="background-color: #FAFAF8">
    <!-- Header -->
    <view class="sticky top-0 z-10 px-5 pt-12 pb-3" style="background-color: #FAFAF8">
      <text class="text-xl font-bold" style="color: #1A1A2E">关于我们</text>
    </view>

    <!-- Content -->
    <view class="px-5 pb-8 space-y-3">
      <!-- Logo Area -->
      <view class="flex flex-col items-center pt-6 pb-4">
        <text class="text-2xl font-bold" style="color: #1A1A2E">{{ appConfig.appName }}</text>
        <text class="text-sm mt-2" style="color: #4A4A68">{{ appConfig.appDesc }}</text>
        <text class="text-xs mt-1" style="color: #E94560">v{{ appConfig.version }}</text>
      </view>

      <!-- Intro Card -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">简介</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          精益副业案例库是一个专注副业案例推荐的平台。通过 AI 评分筛选可操作性最强的高价值项目，每日推送 Top3 精选案例。
        </text>
      </view>

      <!-- Features Card -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold mb-3" style="color: #1A1A2E">功能特点</text>

        <!-- Feature 1 -->
        <view class="flex items-start mb-4">
          <view
            class="flex items-center justify-center flex-shrink-0"
            style="width: 32px; height: 32px; border-radius: 50%; background-color: rgba(233,69,96,0.1)"
          >
            <text style="font-size: 14px; color: #E94560">&#9678;</text>
          </view>
          <view class="ml-3 flex-1">
            <text class="block text-sm font-medium" style="color: #1A1A2E">每日精选</text>
            <text class="block text-xs mt-1" style="color: #9B9A97">AI 评分筛选 Top3 副业案例</text>
          </view>
        </view>

        <!-- Feature 2 -->
        <view class="flex items-start mb-4">
          <view
            class="flex items-center justify-center flex-shrink-0"
            style="width: 32px; height: 32px; border-radius: 50%; background-color: rgba(233,69,96,0.1)"
          >
            <text style="font-size: 14px; color: #E94560">&#9733;</text>
          </view>
          <view class="ml-3 flex-1">
            <text class="block text-sm font-medium" style="color: #1A1A2E">收藏同步</text>
            <text class="block text-xs mt-1" style="color: #9B9A97">收藏感兴趣的项目，云端同步</text>
          </view>
        </view>

        <!-- Feature 3 -->
        <view class="flex items-start">
          <view
            class="flex items-center justify-center flex-shrink-0"
            style="width: 32px; height: 32px; border-radius: 50%; background-color: rgba(233,69,96,0.1)"
          >
            <text style="font-size: 14px; color: #E94560">&#9672;</text>
          </view>
          <view class="ml-3 flex-1">
            <text class="block text-sm font-medium" style="color: #1A1A2E">实践指南</text>
            <text class="block text-xs mt-1" style="color: #9B9A97">每个案例配可操作步骤和工具推荐</text>
          </view>
        </view>
      </view>

      <!-- Contact Card -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">联系我们</text>
        <view class="flex items-center mt-2">
          <text class="text-sm" style="color: #4A4A68">邮箱：{{ appConfig.contactEmail }}</text>
        </view>
      </view>
    </view>

    <!-- Footer -->
    <view class="px-5 pb-8">
      <view class="pt-4" style="border-top: 1px solid #E8E6E1">
        <text class="block text-xs text-center" style="color: #9B9A97">
          &copy; {{ appConfig.copyrightYear }} {{ appConfig.appName }}. All rights reserved.
        </text>
      </view>
    </view>
  </view>
</template>
