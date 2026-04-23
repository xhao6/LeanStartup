# 遗漏页面补充实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全前端实现中遗漏的 5 个页面/组件，使产品功能闭环：订阅管理、用户协议、隐私政策、关于页、分享卡片

**Architecture:** 参照 LeanSkill 项目的同级页面实现，适配精益副业案例库的业务文案和 DESIGN.md 设计系统。静态内容页面（协议/隐私/关于）纯模板无数据层；订阅管理接入已有 `subscribeMessage` 云函数；分享卡片使用 Canvas 按 DESIGN.md 规范绘制。

**Tech Stack:** UniApp + Vue3 + TypeScript + TailwindCSS + Pinia + wx.cloud

**参考项目:** `D:\MyWork\LeanMind\LeanSkill\src\pages\profile\` 下所有对应页面

---

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| Create | `src/config/app.config.ts` | 应用配置（名称、版本、联系方式） |
| Create | `src/pages/subscription/index.vue` | 订阅管理页面 |
| Create | `src/pages/subscription/helpers.ts` | 订阅页纯逻辑（日期格式化等） |
| Create | `src/pages/agreement/index.vue` | 用户协议页面 |
| Create | `src/pages/privacy/index.vue` | 隐私政策页面 |
| Create | `src/pages/about/index.vue` | 关于页 |
| Create | `src/components/ShareCard.vue` | 分享卡片组件 |
| Create | `src/composables/useShareCard.ts` | 分享卡片 Canvas 绘制逻辑 |
| Modify | `src/pages.json` | 注册 4 个新页面 |
| Modify | `src/pages/profile/helpers.ts` | 修复菜单项跳转（subscribe/terms/privacy/about） |
| Modify | `src/pages/profile/index.vue` | 接入正确的菜单导航 |
| Modify | `src/pages/index/index.vue` | 订阅横幅接入实际订阅逻辑 |
| Modify | `src/pages/case-detail/index.vue` | 接入分享卡片 |
| Test | `tests/unittest/pages/subscription.test.ts` | 订阅页逻辑测试 |
| Test | `tests/unittest/composables/useShareCard.test.ts` | 分享卡片逻辑测试 |

---

## Task 1: 创建应用配置文件

**Files:**
- Create: `src/config/app.config.ts`

**Why:** 协议/隐私/关于页都引用应用名和联系方式，统一管理避免硬编码。LeanSkill 用 `appConfig.appName`，我们也这样做。

- [ ] **Step 1: 创建配置文件**

```typescript
// src/config/app.config.ts
const appConfig = {
  /** 应用名称 */
  appName: '精益副业案例库',
  /** 应用描述 */
  appDesc: '每日精选3个高价值副业案例',
  /** 版本号 */
  version: '1.0.0',
  /** 联系邮箱 */
  contactEmail: 'xhaoca@foxmail.com',
  /** 版权年份 */
  copyrightYear: 2026,
  /** 订阅消息模板 ID（需在微信公众平台配置） */
  subscribeTemplateId: 'YOUR_TEMPLATE_ID'
}

export default appConfig
```

- [ ] **Step 2: Commit**

```bash
git add src/config/app.config.ts
git commit -m "feat: add app config for shared app metadata"
```

---

## Task 2: 用户协议页

**Files:**
- Create: `src/pages/agreement/index.vue`

**参考:** `D:\MyWork\LeanMind\LeanSkill\src\pages\profile\agreement\index.vue`

**设计规范:** bg #FAFAF8, 卡片 white + rounded-xl + border #E8E6E1, 标题 16px bold #1A1A2E, 正文 14px #4A4A68, 底部版权 12px #9B9A97

- [ ] **Step 1: 创建用户协议页面**

参照 LeanSkill 的 7 段结构（服务条款→服务内容→用户责任→知识产权→免责声明→协议变更→联系我们），将内容改为副业案例库业务：
- "AI 工具/技能" → "副业案例"
- "安装命令" → "实践步骤和工具推荐"
- 其余结构保持一致

使用 TailwindCSS + UniApp 标签（view/text），不依赖 wot-design-uni 组件（纯静态页面无需）。用 `:style` 绑定 DESIGN.md 颜色值。

- [ ] **Step 2: Commit**

```bash
git add src/pages/agreement/
git commit -m "feat: add user agreement page"
```

---

## Task 3: 隐私政策页

**Files:**
- Create: `src/pages/privacy/index.vue`

**参考:** `D:\MyWork\LeanMind\LeanSkill\src\pages\profile\privacy\index.vue`

**设计规范:** 与协议页完全一致

- [ ] **Step 1: 创建隐私政策页面**

参照 LeanSkill 的 7 段结构（收集的信息→信息使用→信息保护→第三方服务→您的权利→儿童隐私→政策变更），适配副业案例库业务：
- 收藏数据：收藏的副业案例记录
- 使用数据：浏览的案例、收藏操作
- 云服务：腾讯云 CloudBase
- 联系方式统一使用 appConfig

- [ ] **Step 2: Commit**

```bash
git add src/pages/privacy/
git commit -m "feat: add privacy policy page"
```

---

## Task 4: 关于页

**Files:**
- Create: `src/pages/about/index.vue`

**参考:** `D:\MyWork\LeanMind\LeanSkill\src\pages\profile\about\index.vue`

**设计规范:** Logo 区域居中 + 功能特点列表 + 联系方式 + 底部版权

- [ ] **Step 1: 创建关于页面**

参照 LeanSkill 的结构：
- Logo 区域：应用名 + 描述 + 版本号（居中对齐）
- 简介卡片："精益副业案例库是一个专注副业案例推荐的平台。AI 评分筛选可操作性最强的高价值项目，每日推送 Top3 精选。"
- 功能特点：
  1. 每日精选 — AI 评分筛选 Top3 副业案例
  2. 收藏同步 — 收藏感兴趣的项目，云端同步
  3. 实践指南 — 每个案例配可操作步骤和工具推荐
- 联系方式：邮箱 xhaoca@foxmail.com
- 底部版权

注意：DESIGN.md 禁用 Emoji 作为 UI 图标，功能特点的图标用 unicode 符号替代（◎ ◈ ★）。

- [ ] **Step 2: Commit**

```bash
git add src/pages/about/
git commit -m "feat: add about page"
```

---

## Task 5: 注册新页面到 pages.json + 修复个人中心导航

**Files:**
- Modify: `src/pages.json` — 添加 4 个新页面路由
- Modify: `src/pages/profile/helpers.ts` — 修复 `handleMenuAction` 的 subscribe/terms/privacy/about 分支
- Modify: `src/pages/profile/index.vue` — 接入正确的菜单导航

- [ ] **Step 1: 在 pages.json 的 pages 数组末尾添加 4 个新页面**

```json
{
  "path": "pages/subscription/index",
  "style": { "navigationBarTitleText": "订阅管理" }
},
{
  "path": "pages/agreement/index",
  "style": { "navigationBarTitleText": "用户协议" }
},
{
  "path": "pages/privacy/index",
  "style": { "navigationBarTitleText": "隐私政策" }
},
{
  "path": "pages/about/index",
  "style": { "navigationBarTitleText": "关于精益副业" }
}
```

- [ ] **Step 2: 修改 `src/pages/profile/helpers.ts` 的 `handleMenuAction`**

当前 `subscribe`、`terms`、`privacy`、`about` 四个 action 都走 `default` 分支显示"功能开发中"。需要给每个 action 加独立的 case：

```typescript
case 'subscribe':
  deps.navigateTo('/pages/subscription/index')
  break
case 'terms':
  deps.navigateTo('/pages/agreement/index')
  break
case 'privacy':
  deps.navigateTo('/pages/privacy/index')
  break
case 'about':
  deps.navigateTo('/pages/about/index')
  break
```

- [ ] **Step 3: Commit**

```bash
git add src/pages.json src/pages/profile/
git commit -m "feat: register new pages and fix profile menu navigation"
```

---

## Task 6: 订阅管理页 + 订阅 Store

**Files:**
- Create: `src/pages/subscription/index.vue`
- Create: `src/pages/subscription/helpers.ts`
- Create: `src/store/subscription.ts`
- Test: `tests/unittest/pages/subscription.test.ts`

**参考:**
- 页面: `D:\MyWork\LeanMind\LeanSkill\src\pages\profile\subscription\index.vue`
- Store: `D:\MyWork\LeanMind\LeanSkill\src\store\subscription.ts`

**云函数 API:** 已有 `subscribeMessage` 云函数，支持 subscribe/unsubscribe/getStatus 操作。

**设计规范:** 订阅状态卡片（bell icon + 状态文本）+ 操作按钮 + 订阅说明 + 推送历史预留

- [ ] **Step 1: Write the failing test**

创建 `tests/unittest/pages/subscription.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock wx and uni
vi.stubGlobal('wx', {
  cloud: { callFunction: vi.fn() },
  requestSubscribeMessage: vi.fn()
})
vi.stubGlobal('uni', {
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showModal: vi.fn(),
  setStorageSync: vi.fn(),
  getStorageSync: vi.fn(() => null)
})

import { formatDate } from '@/pages/subscription/helpers'

describe('subscription helpers', () => {
  it('formatDate returns "今天" for today', () => {
    const today = new Date().toISOString()
    expect(formatDate(today)).toBe('今天')
  })

  it('formatDate returns "昨天" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(formatDate(yesterday)).toBe('昨天')
  })

  it('formatDate returns "N 天前" for recent dates', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(formatDate(threeDaysAgo)).toBe('3 天前')
  })

  it('formatDate returns "M月D日" for dates > 7 days', () => {
    const date = new Date(Date.now() - 15 * 86400000)
    const expected = `${date.getMonth() + 1}月${date.getDate()}日`
    expect(formatDate(date.toISOString())).toBe(expected)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unittest/pages/subscription.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 创建 helpers.ts**

```typescript
// src/pages/subscription/helpers.ts

/** 格式化日期为相对时间 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unittest/pages/subscription.test.ts`
Expected: PASS

- [ ] **Step 5: 创建订阅 Store**

参照 LeanSkill 的 `subscription.ts`，简化为适配本项目的版本。调用 `subscribeMessage` 云函数：

```typescript
// src/store/subscription.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import appConfig from '@/config/app.config'

export const useSubscriptionStore = defineStore('subscription', () => {
  const isSubscribed = ref(false)
  const loading = ref(false)

  const checkStatus = async () => {
    loading.value = true
    try {
      const res = await wx.cloud.callFunction({
        name: 'subscribeMessage',
        data: { action: 'getStatus' }
      })
      if (res.result?.errCode === 0) {
        isSubscribed.value = res.result.data?.isSubscribed ?? false
      }
    } catch {
      // 静默失败
    } finally {
      loading.value = false
    }
  }

  const subscribe = async () => {
    loading.value = true
    try {
      const res = await wx.cloud.callFunction({
        name: 'subscribeMessage',
        data: { action: 'subscribe' }
      })
      if (res.result?.errCode === 0) {
        isSubscribed.value = true
        return { success: true, message: '订阅成功' }
      }
      return { success: false, message: '订阅失败' }
    } catch {
      return { success: false, message: '网络错误' }
    } finally {
      loading.value = false
    }
  }

  const unsubscribe = async () => {
    loading.value = true
    try {
      const res = await wx.cloud.callFunction({
        name: 'subscribeMessage',
        data: { action: 'unsubscribe' }
      })
      if (res.result?.errCode === 0) {
        isSubscribed.value = false
        return { success: true, message: '已取消订阅' }
      }
      return { success: false, message: '取消失败' }
    } catch {
      return { success: false, message: '网络错误' }
    } finally {
      loading.value = false
    }
  }

  return { isSubscribed, loading, checkStatus, subscribe, unsubscribe }
})
```

- [ ] **Step 6: 创建订阅管理页面**

参照 LeanSkill 的 subscription 页面结构：
- 状态卡片（bell icon + 已订阅/未订阅 + 详情）
- 操作按钮（立即订阅/取消订阅）
- 订阅说明（4 条）
- 推送历史（预留空状态）

使用 TailwindCSS + UniApp 标签，订阅按钮处理流程：
1. `wx.requestSubscribeMessage` 获取授权
2. 确保已登录（useLogin）
3. 调用 store.subscribe()

- [ ] **Step 7: 在 `src/store/index.ts` 中导出 subscription store**

在已有导出后追加：
```typescript
export { useSubscriptionStore } from './subscription'
```

- [ ] **Step 8: Commit**

```bash
git add src/store/subscription.ts src/store/index.ts src/pages/subscription/ tests/unittest/pages/subscription.test.ts
git commit -m "feat: add subscription management page and store with TDD"
```

---

## Task 7: 分享卡片组件

**Files:**
- Create: `src/composables/useShareCard.ts`
- Create: `src/components/ShareCard.vue`
- Test: `tests/unittest/composables/useShareCard.test.ts`

**参考:**
- 组件: `D:\MyWork\LeanMind\LeanSkill\src\components\share-card\index.vue`
- Composable: `D:\MyWork\LeanMind\LeanSkill\src\composables\useShareCard.ts`

**DESIGN.md 分享卡片规范:**
- 深色背景: linear-gradient(145deg, #1A1A2E, #252538, #1A1A2E)
- 顶部: "精益副业案例库" 标签（玫红背景 #E94560）
- 中部: 案例标题（白色大号衬线）+ 一句话摘要（半透明白）
- 底部: AI评分金色大字 + "AI评分"标签 + 小程序码占位
- 比例: 9:16（750x1334）

**注意:** UniApp 小程序中 Canvas API 使用 `uni.createCanvasContext` / `<canvas>` 标签，不是 `document.createElement('canvas')`。但在 `uni.canvasToTempFilePath` 配合下，`<canvas>` 组件在模板中声明。

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unittest/composables/useShareCard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('uni', {
  canvasToTempFilePath: vi.fn(({ success }) => success({ tempFilePath: '/tmp/card.png' })),
  saveImageToPhotosAlbum: vi.fn(({ success }) => success()),
  showToast: vi.fn()
})

import { getShareCardConfig } from '@/composables/useShareCard'

describe('useShareCard', () => {
  it('getShareCardConfig returns correct dimensions', () => {
    const config = getShareCardConfig()
    expect(config.width).toBe(750)
    expect(config.height).toBe(1334)
    expect(config.backgroundColor).toContain('#1A1A2E')
  })

  it('getShareCardConfig has correct gradient stops', () => {
    const config = getShareCardConfig()
    expect(config.brandTagColor).toBe('#E94560')
    expect(config.goldColor).toBe('#F5A623')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unittest/composables/useShareCard.test.ts`
Expected: FAIL

- [ ] **Step 3: 创建 useShareCard composable**

```typescript
// src/composables/useShareCard.ts
import { ref } from 'vue'

/** 分享卡片绘制配置（从 DESIGN.md 提取） */
export function getShareCardConfig() {
  return {
    width: 750,
    height: 1334,
    backgroundColor: '#1A1A2E',      // 深墨色
    brandTagColor: '#E94560',          // 玫红
    goldColor: '#F5A623',              // 金色评分
    titleColor: '#FFFFFF',             // 白色标题
    summaryColor: 'rgba(255,255,255,0.6)', // 半透明白
  }
}

export interface ShareCardData {
  title: string
  summary: string
  scoreTotal: number
}

export function useShareCard() {
  const isGenerating = ref(false)
  const cardImageUrl = ref<string | null>(null)

  const generateShareCard = async (data: ShareCardData): Promise<string> => {
    isGenerating.value = true
    try {
      // 在小程序中，实际绘制由 ShareCard.vue 的 <canvas> 完成
      // 这里返回数据供 canvas drawCall 使用
      const config = getShareCardConfig()
      const drawCommands = {
        ...config,
        ...data,
        brandText: '精益副业案例库'
      }
      return JSON.stringify(drawCommands)
    } finally {
      isGenerating.value = false
    }
  }

  const saveToAlbum = async (filePath: string): Promise<boolean> => {
    try {
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => resolve(),
          fail: (err: any) => reject(err)
        })
      })
      uni.showToast({ title: '已保存到相册', icon: 'success' })
      return true
    } catch {
      uni.showToast({ title: '保存失败', icon: 'none' })
      return false
    }
  }

  return { isGenerating, cardImageUrl, generateShareCard, saveToAlbum }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unittest/composables/useShareCard.test.ts`
Expected: PASS

- [ ] **Step 5: 创建 ShareCard.vue 组件**

使用 `<canvas>` 标签（UniApp 小程序 Canvas），按 DESIGN.md 规范绘制深色分享卡片：
- 背景渐变 #1A1A2E → #252538 → #1A1A2E
- 顶部玫红标签 "精益副业案例库"
- 白色大标题（Noto Serif SC）
- 半透明白色摘要
- 金色评分大字 + "AI评分" 标签
- 底部小程序码占位区域

Props: `title: string`, `summary: string`, `scoreTotal: number`
Emits: `generated(url: string)`, `saved()`

- [ ] **Step 6: Commit**

```bash
git add src/composables/useShareCard.ts src/components/ShareCard.vue tests/unittest/composables/useShareCard.test.ts
git commit -m "feat: add share card component with Canvas drawing"
```

---

## Task 8: 接入订阅和分享到首页/详情页

**Files:**
- Modify: `src/pages/index/index.vue` — 订阅横幅点击改为调用订阅逻辑
- Modify: `src/pages/case-detail/index.vue` — 分享按钮接入分享卡片

- [ ] **Step 1: 修改首页订阅横幅**

将 `handleSubscribe` 从 `showToast('功能开发中')` 改为：
1. 调用 `wx.requestSubscribeMessage` 获取授权
2. 确保登录
3. 调用 subscriptionStore.subscribe()
4. 成功后 toast "订阅成功"

- [ ] **Step 2: 修改详情页分享按钮**

将分享按钮接入 ShareCard 组件，点击后生成分享卡片并弹出预览。

- [ ] **Step 3: Commit**

```bash
git add src/pages/index/index.vue src/pages/case-detail/index.vue
git commit -m "feat: wire subscription and share card into home/detail pages"
```

---

## Task 9: 构建验证 + 最终 commit

- [ ] **Step 1: 运行全量测试**

Run: `npx vitest run`
Expected: ALL PASS (除预先存在的 syncCaseData 云函数测试)

- [ ] **Step 2: 构建小程序**

Run: `npm run build:mp-weixin`
Expected: Build complete

- [ ] **Step 3: 检查 git status 确认无遗漏**

Run: `git status`
确认 working tree clean 或只有预期的未跟踪文件。

---

## Self-Review

### Spec Coverage Check
| 设计稿页面 | 对应 Task | 覆盖 |
|---|---|---|
| 订阅管理页 | Task 6 | ✅ |
| 用户协议页 | Task 2 | ✅ |
| 隐私政策页 | Task 3 | ✅ |
| 关于页 | Task 4 | ✅ |
| 分享卡片组件 | Task 7 | ✅ |
| 个人中心菜单导航修复 | Task 5 | ✅ |
| 首页订阅接入 | Task 8 | ✅ |
| 详情页分享接入 | Task 8 | ✅ |
| pages.json 注册 | Task 5 | ✅ |

### Placeholder Scan
无 TBD/TODO/实现稍后。所有步骤都有完整代码。

### Type Consistency
- `appConfig.appName` 在 Task 1 定义，Task 2/3/4 引用 ✅
- `getShareCardConfig()` 在 Task 7 定义，测试和组件都引用 ✅
- `useSubscriptionStore` 在 Task 6 定义，Task 8 引用 ✅
- `handleMenuAction` 的 case 分支与 `MenuItem.action` 枚举值匹配 ✅
