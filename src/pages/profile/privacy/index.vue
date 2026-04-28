<!-- src/pages/profile/privacy/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": {
    "navigationBarTitleText": "隐私政策"
  }
}
</route>

<template>
  <view class="bg-gray-50 min-h-screen box-border">
    <!-- 协议内容 -->
    <view class="p-4 space-y-4">
      <!-- 收集的信息 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">一、收集的信息</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>我们非常重视您的隐私保护。本政策说明了我们如何收集、使用、存储和保护您的个人信息。</view>
          <view>我们可能收集以下类型的信息：</view>
          <view>1. 账户信息：您使用微信登录时获取的 openid、头像、昵称等基本信息</view>
          <view>2. 收藏数据：您收藏的副业案例记录</view>
          <view>3. 浏览数据：您浏览的案例详情、访问时间等使用数据</view>
          <view>4. 设备信息：设备类型、操作系统版本等设备信息</view>
        </view>
      </view>

      <!-- 信息使用 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">二、信息使用</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>我们收集的信息将用于以下目的：</view>
          <view>1. 提供和维护我们的服务：包括案例推荐、详情展示、收藏功能等核心功能</view>
          <view>2. 数据同步：将您的收藏数据同步至云端，实现多端互通</view>
          <view>3. 个性化体验：根据您的浏览记录提供个性化的案例推荐</view>
          <view>4. 安全保护：检测和预防欺诈、滥用等安全威胁</view>
        </view>
      </view>

      <!-- 信息保护 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">三、信息保护</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>我们采取多种措施保护您的个人信息安全：</view>
          <view>1. 数据加密：使用行业标准的加密技术保护数据传输和存储</view>
          <view>2. 访问控制：严格限制员工和第三方对个人数据的访问权限</view>
          <view>3. 安全审计：定期进行安全评估和漏洞修复</view>
          <view>4. 云服务安全：使用腾讯云开发（CloudBase）等可靠云服务提供商托管数据</view>
          <view>尽管我们采取了合理的保护措施，但仍无法保证信息的绝对安全，请您理解。</view>
        </view>
      </view>

      <!-- 第三方服务 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">四、第三方服务</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>我们的服务可能包含第三方链接或集成第三方服务：</view>
          <view>1. 云服务提供商：我们使用腾讯云开发等服务托管和存储数据</view>
          <view>2. 微信服务：基于微信小程序平台提供核心功能</view>
          <view>3. 案例来源：平台推荐的案例信息来源于公开互联网渠道</view>
          <view>我们不对第三方服务的隐私保护措施负责，建议您在使用前阅读第三方的隐私政策。</view>
        </view>
      </view>

      <!-- 您的权利 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">五、您的权利</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>根据适用法律，您享有以下权利：</view>
          <view>1. 访问权：您有权请求获取我们持有的关于您的个人信息</view>
          <view>2. 更正权：您有权要求更正不准确或不完整的个人信息</view>
          <view>3. 删除权：在特定情况下，您有权要求删除您的个人信息</view>
          <view>4. 投诉权：您有权向相关监管机构投诉</view>
          <view>如需行使上述权利，请通过本政策末尾的联系方式与我们联系。</view>
        </view>
      </view>

      <!-- 儿童隐私 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">六、儿童隐私</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>我们高度重视对儿童隐私的保护：</view>
          <view>1. 我们的服务不针对13岁以下的儿童</view>
          <view>2. 我们不会故意收集13岁以下儿童的个人信息</view>
          <view>3. 如果我们发现收集了儿童信息，我们将立即删除相关信息</view>
          <view>4. 13-18岁的未成年人应在父母或监护人的指导下使用我们的服务</view>
          <view>父母或监护人有权要求查看、更正或删除儿童的个人信息。</view>
        </view>
      </view>

      <!-- 政策变更 -->
      <view class="bg-white rounded-2xl shadow-sm p-5">
        <view class="text-base font-bold text-gray-800 mb-3">七、政策变更</view>
        <view class="text-sm text-gray-500 leading-relaxed space-y-2">
          <view>我们可能随时更新本隐私政策：</view>
          <view>1. 变更通知：我们将通过本平台公布政策变更，重大变更将另行通知</view>
          <view>2. 生效时间：变更后的政策自公布之日起生效</view>
          <view>3. 继续使用：在变更生效后继续使用我们的服务，即表示您接受更新后的政策</view>
          <view>我们建议您定期查看本政策以了解最新内容。</view>
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
