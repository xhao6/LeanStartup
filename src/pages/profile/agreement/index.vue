<!-- src/pages/profile/agreement/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": {
    "navigationBarTitleText": "用户协议"
  }
}
</route>

<template>
  <view class="bg-gray-50 min-h-screen box-border">
    <!-- 协议内容 -->
    <view class="p-4 space-y-4">
      <!-- 服务条款 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">一、服务条款</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>欢迎使用 {{ appConfig.appName }}（以下简称"本平台"）。本平台为用户提供副业案例信息推荐服务，您在使用本平台服务之前，请仔细阅读以下服务条款。</view>
          <view>您通过任何方式访问或使用本平台，即表示您已阅读、理解并同意接受本协议的所有条款和条件。如果您不同意本协议的任何内容，请立即停止使用本平台。</view>
        </view>
      </view>

      <!-- 服务内容 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">二、服务内容</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>本平台主要为用户提供以下服务内容：</view>
          <view>1. 每日精选副业案例推荐与发现</view>
          <view>2. 案例详情浏览与收藏</view>
          <view>3. 多维度评分展示（可行性、利润率、时效性等）</view>
          <view>4. 案例进度跟踪功能</view>
          <view>5. 用户收藏数据云端同步</view>
          <view>6. 历史榜单回顾功能</view>
          <view>本平台保留随时调整、修改或终止部分或全部服务的权利。</view>
        </view>
      </view>

      <!-- 用户责任 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">三、用户责任</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>您在使用本平台服务时承诺遵守以下事项：</view>
          <view>1. 妥善保管您的微信账户，因账户泄露造成的损失由您自行承担</view>
          <view>2. 不得利用本平台从事任何违法、违规或损害他人利益的活动</view>
          <view>3. 不得对本平台进行任何形式的攻击、侵入或破坏</view>
          <view>4. 遵守适用的法律法规和本协议的各项约定</view>
          <view>如您违反上述约定，本平台有权采取必要措施，包括但不限于暂停或终止服务。</view>
        </view>
      </view>

      <!-- 知识产权 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">四、知识产权</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>本平台的所有内容，包括但不限于文字、图片、图标、软件等，均受知识产权法保护。</view>
          <view>未经本平台书面授权，您不得以任何形式复制、传播、修改、出售或使用本平台的任何内容。</view>
          <view>本平台引用的案例信息来源于公开渠道，版权归原作者或发布者所有。</view>
        </view>
      </view>

      <!-- 免责声明 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">五、免责声明</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>1. 本平台尽可能提供准确、可靠的案例信息，但不对其准确性、完整性、时效性做任何明示或暗示的保证。</view>
          <view>2. 案例仅供参考，不构成任何投资建议。您根据案例信息做出的决策，本平台不承担责任。</view>
          <view>3. 本平台可能包含第三方链接或内容，我们不对第三方内容负责。</view>
          <view>4. 因不可抗力、平台维护、系统故障等导致服务中断，本平台不承担责任。</view>
        </view>
      </view>

      <!-- 协议变更 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">六、协议变更</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>本平台有权根据业务发展需要，随时修改或更新本协议条款。修改后的协议将在本平台上公布，并自公布之日起生效。</view>
          <view>您应在使用本平台前仔细阅读最新的协议条款。如您不同意变更后的协议，请停止使用本平台。继续使用本平台即表示您接受变更后的协议。</view>
        </view>
      </view>

      <!-- 联系我们 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">七、联系我们</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>如您对本协议有任何疑问、意见或建议，欢迎通过以下方式联系我们：</view>
          <view>邮箱: xhaoca@foxmail.com</view>
          <view>我们将在收到您的反馈后尽快回复。</view>
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
</script>
