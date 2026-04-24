<!-- src/pages/profile/about/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": { "navigationBarTitleText": "关于" }
}
</route>

<template>
  <view class="about-page" style="background: #FAFAF8; min-height: 100vh;">
    <view class="about-content">
      <text class="app-name">精益副业案例库</text>
      <text class="app-version">v1.0.0</text>
      <text class="app-desc">每日精选 3 个可落地的副业赚钱案例，通过多维评分体系帮你发现真正值得尝试的机会。</text>

      <view class="info-card">
        <view class="info-item">
          <text class="info-label">评分维度</text>
          <text class="info-value">可行性 · 利润率 · 时效性 · 细节度 · 匹配度</text>
        </view>
        <view class="info-divider"></view>
        <view class="info-item">
          <text class="info-label">数据来源</text>
          <text class="info-value">全网副业实战帖子精选</text>
        </view>
        <view class="info-divider"></view>
        <view class="info-item">
          <text class="info-label">更新频率</text>
          <text class="info-value">每日 8:00 准时更新</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.about-content {
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-name {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 4px;
}

.app-version {
  font-size: 13px;
  color: #9B9A97;
  margin-bottom: 16px;
}

.app-desc {
  font-size: 14px;
  color: #4A4A68;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 24px;
}

.info-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.info-label {
  font-size: 14px;
  color: #9B9A97;
}

.info-value {
  font-size: 14px;
  color: #1A1A2E;
  font-weight: 500;
  text-align: right;
  max-width: 200px;
}

.info-divider {
  height: 1px;
  background: #E8E6E1;
}
</style>
