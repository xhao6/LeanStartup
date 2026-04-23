<script setup lang="ts">
import appConfig from '@/config/app.config'
</script>

<template>
  <view class="min-h-screen" style="background-color: #FAFAF8">
    <!-- Header -->
    <view class="sticky top-0 z-10 px-5 pt-12 pb-3" style="background-color: #FAFAF8">
      <text class="text-xl font-bold" style="color: #1A1A2E">用户协议</text>
    </view>

    <!-- Content -->
    <view class="px-5 pb-8 space-y-3">
      <!-- Section 1: 服务条款 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">一、服务条款</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          欢迎使用{{ appConfig.appName }}（以下简称"本应用"）。在使用本应用之前，请您仔细阅读并充分理解本用户协议（以下简称"本协议"）。您一旦使用本应用，即视为您已阅读并同意受本协议的约束。
        </text>
      </view>

      <!-- Section 2: 服务内容 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">二、服务内容</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          本应用为用户提供以下服务内容：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 通过 AI 评分系统筛选可操作性最强的高价值副业案例；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 每日精选推荐 3 个优质副业案例，帮助用户发现适合的副业机会；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 收藏功能支持云端同步，方便用户跨设备管理感兴趣的项目；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          4. 为每个案例提供可操作的实践步骤和实用工具推荐。
        </text>
      </view>

      <!-- Section 3: 用户责任 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">三、用户责任</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          在使用本应用时，用户应当：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          1. 妥善保管自己的账户信息，对账户下的所有行为负责；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 不得利用本应用从事任何违反法律法规的活动；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 不得对本应用进行恶意攻击、破解或干扰其正常运营；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          4. 遵守中华人民共和国相关法律法规及本协议约定。
        </text>
      </view>

      <!-- Section 4: 知识产权 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">四、知识产权</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          1. 本应用中的所有内容（包括但不限于文字、图片、音频、视频、软件、程序及版面设计）均受中华人民共和国著作权法、商标法及其他知识产权法律法规的保护；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 未经本应用书面授权，任何人不得以任何形式复制、转载、摘编或传播本应用的内容；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 本应用中引用的第三方内容（包括但不限于文章、图片、工具链接等）的知识产权归原权利人所有。
        </text>
      </view>

      <!-- Section 5: 免责声明 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">五、免责声明</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          1. 本应用提供的副业案例仅供参考，不构成任何投资或商业建议。我们不对案例的准确性、完整性或时效性作出保证；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          2. 对于用户因使用本应用中推荐的第三方工具或服务所产生的任何损失，本应用不承担责任；
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          3. 因不可抗力（包括但不限于自然灾害、政策变化、网络攻击等）导致的服务中断或数据丢失，本应用不承担责任。
        </text>
      </view>

      <!-- Section 6: 协议变更 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">六、协议变更</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          本应用有权根据业务发展和法律法规的要求，随时修改本协议的内容。修改后的协议一经公布即生效，取代原协议。如您在协议变更后继续使用本应用，即视为您同意受修改后协议的约束。
        </text>
      </view>

      <!-- Section 7: 联系我们 -->
      <view class="rounded-xl p-5" style="background-color: #FFFFFF; border: 1px solid #E8E6E1">
        <text class="text-base font-bold" style="color: #1A1A2E">七、联系我们</text>
        <text class="block text-sm leading-relaxed mt-2" style="color: #4A4A68">
          如您对本协议有任何疑问或建议，请通过以下方式联系我们：
        </text>
        <text class="block text-sm mt-1" style="color: #4A4A68">
          邮箱：{{ appConfig.contactEmail }}
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
