<!-- src/pages/profile/privacy/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": { "navigationBarTitleText": "隐私政策" }
}
</route>

<template>
  <view class="legal-page" style="background: #FAFAF8; min-height: 100vh;">
    <view class="legal-content">
      <text class="legal-title">隐私政策</text>
      <text class="legal-text">最后更新日期：2026年4月24日</text>

      <text class="legal-section-title">一、信息收集</text>
      <text class="legal-text">本应用通过微信小程序平台运行，可能收集以下信息：微信 openid（用于身份识别）、收藏数据、订阅状态。我们不会收集您的真实姓名、手机号等个人信息。</text>

      <text class="legal-section-title">二、信息使用</text>
      <text class="legal-text">收集的信息仅用于：提供案例推荐服务、保存用户收藏和订阅状态、改善用户体验。我们不会将您的信息出售给第三方。</text>

      <text class="legal-section-title">三、信息存储</text>
      <text class="legal-text">用户数据存储在腾讯云开发（CloudBase）平台，享有企业级安全保障。本地缓存数据存储在您的设备上，您可随时清除。</text>

      <text class="legal-section-title">四、用户权利</text>
      <text class="legal-text">您有权随时清除本地缓存数据、取消订阅推送通知。如需删除云端数据，请联系客服处理。</text>
    </view>
  </view>
</template>

<style scoped>
.legal-content {
  padding: 20px;
}

.legal-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 8px;
}

.legal-text {
  display: block;
  font-size: 14px;
  color: #4A4A68;
  line-height: 1.8;
  margin-bottom: 12px;
}

.legal-section-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  margin-top: 20px;
  margin-bottom: 8px;
}
</style>
