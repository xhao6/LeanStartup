<!-- src/pages/profile/agreement/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": { "navigationBarTitleText": "用户协议" }
}
</route>

<template>
  <view class="legal-page" style="background: #FAFAF8; min-height: 100vh;">
    <view class="legal-content">
      <text class="legal-title">用户协议</text>
      <text class="legal-text">最后更新日期：2026年4月24日</text>

      <text class="legal-section-title">一、服务说明</text>
      <text class="legal-text">精益副业案例库（以下简称"本应用"）为用户提供副业案例信息推荐服务。所有案例仅供参考，不构成任何投资建议。</text>

      <text class="legal-section-title">二、用户行为规范</text>
      <text class="legal-text">用户在使用本应用时，应遵守相关法律法规，不得利用本应用从事违法活动。用户应对自己的行为承担全部责任。</text>

      <text class="legal-section-title">三、免责声明</text>
      <text class="legal-text">本应用提供的案例信息来源于公开渠道，我们尽力确保信息准确性但不作保证。用户根据案例信息做出的决策，本应用不承担任何责任。</text>

      <text class="legal-section-title">四、知识产权</text>
      <text class="legal-text">本应用的所有内容（包括但不限于文字、图片、设计）均为原创或已获授权，未经许可不得转载。</text>
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
