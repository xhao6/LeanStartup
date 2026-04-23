<script setup lang="ts">
import appConfig from '@/config/app.config'
</script>

<template>
  <view class="min-h-screen" style="background-color: #FAFAF8">
    <!-- Header -->
    <view class="sticky top-0 z-10 px-5 pt-12 pb-3" style="background-color: #FAFAF8">
      <text class="text-xl font-bold" style="color: #1A1A2E">隐私政策</text>
    </view>

    <!-- Content -->
    <view class="px-5 pb-8 space-y-3">
      <!-- Section 1: 收集的信息 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">一、收集的信息</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          为了向您提供优质的服务，我们可能会收集以下信息：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 微信登录信息：当您通过微信登录时，我们会获取您的微信头像和昵称；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 收藏数据：您在应用中收藏的案例数据，用于提供个性化服务；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 设备信息：包括设备型号、操作系统版本等，用于优化应用体验；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          4. 使用数据：包括访问页面、功能使用情况等，用于改进服务质量。
        </text>
      </view>

      <!-- Section 2: 信息使用 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">二、信息使用</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          我们收集的信息将用于以下目的：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 提供和维护本应用的核心服务功能；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 实现收藏数据的云端同步，确保跨设备一致性；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 基于您的使用偏好提供个性化案例推荐；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          4. 检测和防范安全风险，保护您的账户安全。
        </text>
      </view>

      <!-- Section 3: 信息保护 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">三、信息保护</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          我们采取多种措施保护您的个人信息安全：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 数据加密：对敏感信息进行加密存储和传输；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 访问控制：严格限制可访问用户数据的员工范围和权限；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 安全审计：定期进行安全评估和漏洞扫描；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          4. 本应用数据托管于腾讯云 CloudBase 平台，享有企业级安全保障。
        </text>
      </view>

      <!-- Section 4: 第三方服务 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">四、第三方服务</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          本应用可能涉及以下第三方服务：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 腾讯云：提供数据存储和云计算服务基础设施；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 微信小程序平台：提供应用运行环境和用户身份认证服务；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 公众号文章来源：部分案例内容来源于公开的公众号文章，我们会对原始内容进行加工整理。
        </text>
      </view>

      <!-- Section 5: 您的权利 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">五、您的权利</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          关于您的个人信息，您享有以下权利：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 访问权：您有权查看我们持有的您的个人信息；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 更正权：如发现信息有误，您有权要求更正；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 删除权：在符合条件的情况下，您可以要求删除您的个人信息；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          4. 投诉权：如您认为我们处理个人信息的方式损害了您的合法权益，您有权向有关部门投诉。
        </text>
      </view>

      <!-- Section 6: 儿童隐私 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">六、儿童隐私</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          1. 本应用不面向 13 周岁以下的儿童。我们不会故意收集 13 周岁以下儿童的个人信息；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 13 至 18 周岁的未成年人应在监护人的指导下使用本应用，并在取得监护人同意后使用相关服务。
        </text>
      </view>

      <!-- Section 7: 政策变更 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">七、政策变更</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          1. 我们可能会不时更新本隐私政策，更新后的政策将在本应用内公布；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 对于重大变更，我们会通过应用内通知或其他适当方式提醒您；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 政策变更公布后，如您继续使用本应用，即视为您接受变更后的隐私政策。
        </text>
      </view>
    </view>

    <!-- Footer -->
    <view class="px-5 pb-8">
      <view class="pt-4" style="border-top: 1px solid #E8E6E1">
        <text class="block text-xs text-center" style="color: #9B9A97">
          &copy; {{ appConfig.copyrightYear }} {{ appConfig.appName }}. All rights reserved.
        </text>
        <text class="block text-xs text-center mt-1" style="color: #9B9A97">
          最后更新：2026年4月23日
        </text>
      </view>
    </view>
  </view>
</template>
