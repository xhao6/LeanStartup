# 前端移植计划 4 — 附加页面

> **日期:** 2026-04-24
> **状态:** review完成 ✅
> **前置计划:** `plan-3-secondary-pages.md`

---

## 目标

实现 4 个 P2 可选页面：隐私政策、用户协议、关于、订阅管理。

---

## 任务清单

### Task 4.1: 隐私政策页（pages/profile/privacy/index.vue）

**文件:**
- 创建: `src/pages/profile/privacy/index.vue`

**步骤:**

- [ ] **Step 1: 创建页面**

```vue
<!-- src/pages/profile/privacy/index.vue -->
<template>
  <view class="privacy-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="隐私政策"
    />

    <scroll-view class="content-scroll" scroll-y>
      <view class="content-body">
        <view class="policy-section">
          <text class="policy-title">引言</text>
          <text class="policy-text">
            我们非常重视您的个人信息安全和隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息，以及您享有的相关权利。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">一、信息收集</text>
          <text class="policy-text">
            我们收集的信息包括：您主动提供的信息（如收藏记录、阅读历史）、在使用过程中自动采集的信息（设备信息、访问日志）以及从第三方获取的信息。我们承诺仅收集提供服务所必需的信息。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">二、信息使用</text>
          <text class="policy-text">
            我们使用收集的信息用于：提供和改进服务、分析使用情况、保障账号安全、推送个性化内容（需您同意）以及法律法规要求的其他用途。我们不会将您的信息用于与您同意的目的无关的用途。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">三、信息共享</text>
          <text class="policy-text">
            未经您同意，我们不会与任何第三方共享您的个人信息，但以下情况除外：法律法规要求、为了保护我们的合法权益、为您提供服务而与授权合作伙伴共享（仅限必要范围）。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">四、信息安全</text>
          <text class="policy-text">
            我们采用业界领先的安全技术措施保护您的数据，包括数据加密、访问控制、安全审计等。但请注意，互联网传输存在固有风险，我们无法完全保证信息传输的绝对安全。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">五、您的权利</text>
          <text class="policy-text">
            您对您的个人信息享有：知情权、访问权、更正权、删除权、撤回同意权以及注销账号权。如需行使上述权利，请通过联系方式与我们联系。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">六、未成年人保护</text>
          <text class="policy-text">
            我们非常重视对未成年人信息的保护。如果您是未满18周岁的未成年人，请在监护人的陪同下阅读本政策，并在取得监护人同意后使用我们的服务。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">七、变更通知</text>
          <text class="policy-text">
            我们可能会适时更新本隐私政策。变更时，我们会在产品内显著位置提示或通过其他方式通知您。建议您定期查阅以了解最新版本。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">八、联系方式</text>
          <text class="policy-text">
            如您对本隐私政策有任何疑问、意见或投诉，请通过以下方式联系我们：[联系邮箱]。我们将在15个工作日内回复您的请求。
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 固定底部同意按钮 -->
    <view class="fixed-bottom">
      <wd-button type="primary" round block @click="handleAgree">
        同意并继续
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
const goBack = () => uni.navigateBack()
const handleAgree = () => uni.navigateBack()
</script>

<style lang="scss" scoped>
.privacy-page {
  min-height: 100vh;
  background: #FAFAF8;
  display: flex;
  flex-direction: column;
}
.content-scroll {
  flex: 1;
  height: calc(100vh - 200rpx);
}
.content-body {
  padding: 32rpx;
}
.policy-section {
  margin-bottom: 40rpx;
}
.policy-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A2E;
  display: block;
  margin-bottom: 16rpx;
}
.policy-text {
  font-size: 28rpx;
  color: #4A4A68;
  line-height: 1.9;
  display: block;
}
.fixed-bottom {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #E8E6E1;
}
</style>
```

- [ ] **Step 2: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/profile/privacy/index",
  "style": {
    "navigationBarTitleText": "隐私政策"
  }
}
```

---

### Task 4.2: 用户协议页（pages/profile/agreement/index.vue）

**文件:**
- 创建: `src/pages/profile/agreement/index.vue`

**步骤:**

- [ ] **Step 1: 创建页面**

```vue
<!-- src/pages/profile/agreement/index.vue -->
<template>
  <view class="agreement-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="用户协议"
    />

    <scroll-view class="content-scroll" scroll-y>
      <view class="content-body">
        <view class="policy-section">
          <text class="policy-title">引言</text>
          <text class="policy-text">
            欢迎使用「精益副业案例库」（以下简称"我们"）提供的服务。在您开始使用我们的服务之前，请仔细阅读本协议的全部内容。如果您不同意本协议的任何内容，请不要注册或使用我们的服务。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">一、服务说明</text>
          <text class="policy-text">
            我们致力于每天精选并展示 3 个优质的副业赚钱案例，帮助用户了解不同的搞钱方式和实操经验。我们不对案例的商业收益做任何保证，实际情况会因个人能力、市场环境等因素而有所不同。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">二、账号注册</text>
          <text class="policy-text">
            您无需注册即可浏览案例内容。收藏等部分功能需要您授权登录后方可使用。您的账号信息仅用于为您提供服务，不会用于其他商业目的。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">三、内容免责</text>
          <text class="policy-text">
            本平台展示的案例来源于公开渠道，仅供参考学习。我们不对案例内容的真实性、可行性、收益情况做任何担保。使用案例中的任何方法或建议时，请自行评估风险并承担后果。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">四、知识产权</text>
          <text class="policy-text">
            本平台的所有内容（包括但不限于文字、图片、案例描述）均受知识产权保护。未经授权，您不得对内容进行复制、转载、修改或用于商业目的。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">五、用户行为</text>
          <text class="policy-text">
            您同意在使用本服务时遵守相关法律法规，不得发布违法、违规、侵权或有害内容。如有违反，我们有权采取相应措施，包括但不限于删除内容、限制功能或终止服务。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">六、服务变更</text>
          <text class="policy-text">
            我们保留随时修改或中断服务的权利，并会尽可能提前通知用户。因服务变更导致的任何损失，我们不承担责任，但会尽力减少对用户的影响。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">七、争议解决</text>
          <text class="policy-text">
            本协议的解释和执行均适用中华人民共和国法律。如发生争议，双方应友好协商解决；协商不成的，任一方可向有管辖权的人民法院提起诉讼。
          </text>
        </view>

        <view class="policy-section">
          <text class="policy-title">八、联系我们</text>
          <text class="policy-text">
            如您对本协议有任何疑问，请通过以下方式联系我们：[联系邮箱]。我们将在15个工作日内回复您的请求。
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 固定底部同意按钮 -->
    <view class="fixed-bottom">
      <wd-button type="primary" round block @click="handleAgree">
        同意并继续
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
const goBack = () => uni.navigateBack()
const handleAgree = () => uni.navigateBack()
</script>

<style lang="scss" scoped>
.agreement-page {
  min-height: 100vh;
  background: #FAFAF8;
  display: flex;
  flex-direction: column;
}
.content-scroll {
  flex: 1;
  height: calc(100vh - 200rpx);
}
.content-body {
  padding: 32rpx;
}
.policy-section {
  margin-bottom: 40rpx;
}
.policy-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A2E;
  display: block;
  margin-bottom: 16rpx;
}
.policy-text {
  font-size: 28rpx;
  color: #4A4A68;
  line-height: 1.9;
  display: block;
}
.fixed-bottom {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #E8E6E1;
}
</style>
```

- [ ] **Step 2: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/profile/agreement/index",
  "style": {
    "navigationBarTitleText": "用户协议"
  }
}
```

---

### Task 4.3: 关于页（pages/profile/about/index.vue）

**文件:**
- 创建: `src/pages/profile/about/index.vue`

**步骤:**

- [ ] **Step 1: 创建页面**

```vue
<!-- src/pages/profile/about/index.vue -->
<template>
  <view class="about-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="关于"
    />

    <view class="about-content">
      <!-- Logo 区域 -->
      <view class="logo-section">
        <view class="app-logo">
          <text class="logo-text">搞钱</text>
        </view>
        <text class="app-name">精益副业案例库</text>
        <text class="app-version">v1.0.0</text>
      </view>

      <!-- 产品介绍 -->
      <view class="intro-section">
        <text class="section-title">产品介绍</text>
        <text class="intro-text">
          「精益副业案例库」每天精选 3 个优质的副业赚钱案例，从落地可行性、收益潜力、时效性、实操细节、用户适配度五个维度进行评分，帮助你找到适合自己的搞钱方式。
        </text>
        <text class="intro-text">
          我们相信：好的案例值得被看见，好的方法值得被学习。
        </text>
      </view>

      <!-- 功能亮点 -->
      <view class="features-section">
        <text class="section-title">功能亮点</text>
        <view class="feature-list">
          <view class="feature-item">
            <wd-icon name="check-circle" size="18px" color="#3D5C3D" />
            <text>每日精选 3 个高质量案例</text>
          </view>
          <view class="feature-item">
            <wd-icon name="check-circle" size="18px" color="#3D5C3D" />
            <text>五维度专业评分体系</text>
          </view>
          <view class="feature-item">
            <wd-icon name="check-circle" size="18px" color="#3D5C3D" />
            <text>实践步骤 checklist 跟踪</text>
          </view>
          <view class="feature-item">
            <wd-icon name="check-circle" size="18px" color="#3D5C3D" />
            <text>收藏夹云同步</text>
          </view>
          <view class="feature-item">
            <wd-icon name="check-circle" size="18px" color="#3D5C3D" />
            <text>历史榜单按月归档</text>
          </view>
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="contact-section">
        <text class="section-title">联系我们</text>
        <view class="contact-item">
          <text class="contact-label">商务合作</text>
          <text class="contact-value">business@example.com</text>
        </view>
        <view class="contact-item">
          <text class="contact-label">意见反馈</text>
          <text class="contact-value">feedback@example.com</text>
        </view>
      </view>

      <!-- 备案信息 -->
      <view class="beian-section">
        <text class="beian-text">
          © 2026 精益副业案例库 | 京ICP备XXXXXXXX号
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const goBack = () => uni.navigateBack()
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  background: #FAFAF8;
}
.about-content {
  padding: 32rpx;
}
.logo-section {
  text-align: center;
  padding: 48rpx 0;
}
.app-logo {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #1A1A2E 0%, #E94560 100%);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
}
.logo-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 48rpx;
  font-weight: 700;
  color: #FFFFFF;
}
.app-name {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A2E;
  margin-bottom: 8rpx;
}
.app-version {
  display: block;
  font-family: 'Roboto Mono', monospace;
  font-size: 26rpx;
  color: #9B9A97;
}
.intro-section, .features-section, .contact-section {
  margin-bottom: 40rpx;
}
.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A2E;
  display: block;
  margin-bottom: 16rpx;
}
.intro-text {
  font-size: 28rpx;
  color: #4A4A68;
  line-height: 1.8;
  display: block;
  margin-bottom: 16rpx;
}
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.feature-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 28rpx;
  color: #4A4A68;
}
.contact-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E8E6E1;
}
.contact-label {
  font-size: 28rpx;
  color: #9B9A97;
}
.contact-value {
  font-size: 28rpx;
  color: #1A1A2E;
}
.beian-section {
  text-align: center;
  padding: 40rpx 0;
}
.beian-text {
  font-size: 22rpx;
  color: #9B9A97;
}
</style>
```

- [ ] **Step 2: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/profile/about/index",
  "style": {
    "navigationBarTitleText": "关于"
  }
}
```

---

### Task 4.4: 订阅管理页（pages/profile/subscription/index.vue）

**文件:**
- 创建: `src/pages/profile/subscription/index.vue`

**步骤:**

- [ ] **Step 1: 创建页面**

```vue
<!-- src/pages/profile/subscription/index.vue -->
<template>
  <view class="subscription-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="订阅管理"
    />

    <view class="page-content">
      <!-- 订阅状态卡片 -->
      <view class="status-card">
        <view class="status-icon" :class="{ active: isSubscribed }">
          <wd-icon
            :name="isSubscribed ? 'bell-fill' : 'bell'"
            size="32px"
            :color="isSubscribed ? '#FFFFFF' : '#9B9A97'"
          />
        </view>
        <text class="status-title">
          {{ isSubscribed ? '已订阅每日推送' : '未订阅' }}
        </text>
        <text class="status-desc">
          {{
            isSubscribed
              ? '每天早上 9:00 推送今日精选案例'
              : '订阅后可每天收到今日精选推送'
          }}
        </text>
      </view>

      <!-- 订阅说明 -->
      <view class="info-section">
        <text class="section-title">订阅说明</text>
        <view class="info-item">
          <wd-icon name="clock" size="16px" color="#9B9A97" />
          <text>推送时间：每天上午 9:00</text>
        </view>
        <view class="info-item">
          <wd-icon name="message" size="16px" color="#9B9A97" />
          <text>推送内容：当日精选 Top 3 案例</text>
        </view>
        <view class="info-item">
          <wd-icon name="close-circle" size="16px" color="#9B9A97" />
          <text>随时可取消，取消后不再推送</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-section">
        <wd-button
          v-if="!isSubscribed"
          type="primary"
          round
          block
          @click="handleSubscribe"
          :loading="loading"
        >
          订阅每日推送
        </wd-button>
        <wd-button
          v-else
          plain
          round
          block
          @click="handleUnsubscribe"
          :loading="loading"
        >
          取消订阅
        </wd-button>
      </view>

      <!-- 订阅历史（可选） -->
      <view class="history-section" v-if="isSubscribed && subscriptionHistory.length > 0">
        <text class="section-title">最近订阅</text>
        <view
          v-for="item in subscriptionHistory"
          :key="item.date"
          class="history-item"
        >
          <text class="history-date">{{ formatDate(item.date) }}</text>
          <text class="history-status">{{ item.status }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSubscriptionStatus, subscribe, unsubscribe } from '@/api/modules/subscription'
// 注意：subscription 云函数尚未创建（目前只有 subscribeMessage 是给管理员用的）
// Plan 1 中需要新建 src/api/modules/subscription.ts（见下方 Task 1.X）
// 订阅管理页面 MVP 阶段可先做 UI 占位，云函数后续补充

const loading = ref(false)
const isSubscribed = ref(false)
const subscriptionHistory = ref<{ date: string; status: string }[]>([])

const goBack = () => uni.navigateBack()

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const loadStatus = async () => {
  try {
    const res = await getSubscriptionStatus()
    isSubscribed.value = res.isSubscribed || false
    subscriptionHistory.value = res.history || []
  } catch (e) {
    // 未登录或出错
  }
}

const handleSubscribe = async () => {
  loading.value = true
  try {
    await subscribe()
    isSubscribed.value = true
    uni.showToast({ title: '订阅成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '订阅失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

const handleUnsubscribe = async () => {
  loading.value = true
  try {
    await unsubscribe()
    isSubscribed.value = false
    uni.showToast({ title: '已取消订阅', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(loadStatus)
</script>

<style lang="scss" scoped>
.subscription-page {
  min-height: 100vh;
  background: #FAFAF8;
}
.page-content {
  padding: 32rpx;
}
.status-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  margin-bottom: 32rpx;
  border: 1rpx solid #E8E6E1;
}
.status-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24rpx;
  &.active {
    background: linear-gradient(135deg, #E94560 0%, #F5A623 100%);
  }
}
.status-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A2E;
  margin-bottom: 12rpx;
}
.status-desc {
  display: block;
  font-size: 26rpx;
  color: #9B9A97;
}
.info-section {
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
}
.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A2E;
  display: block;
  margin-bottom: 20rpx;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #4A4A68;
}
.action-section {
  margin-bottom: 32rpx;
}
.history-section {
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 24rpx;
}
.history-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #E8E6E1;
  &:last-child { border-bottom: none; }
}
.history-date {
  font-size: 26rpx;
  color: #4A4A68;
}
.history-status {
  font-size: 26rpx;
  color: #3D5C3D;
}
</style>
```

- [ ] **Step 2: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/profile/subscription/index",
  "style": {
    "navigationBarTitleText": "订阅管理"
  }
}
```

---

## 验收检查点

- [ ] 隐私政策页内容完整、同意按钮正常
- [ ] 用户协议页内容完整、同意按钮正常
- [ ] 关于页显示 Logo、版本号、功能介绍
- [ ] 订阅管理可订阅/退订成功
- [ ] 所有页面返回按钮正常
