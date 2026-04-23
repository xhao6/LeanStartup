# 前端实现计划 — 精益副业案例库

> **最后更新:** 2026-04-23（设计对齐更新）

> **Design Alignment:** 本计划与 `docs/design/preview.html` 设计稿完全对齐。所有代码输出请严格遵循 DESIGN.md 设计系统。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建微信小程序（UniApp + Vue3 + TypeScript），实现每日推送3个精选副业案例，支持AI评分筛选、收藏分享、订阅推送等核心功能。

**Architecture:** 采用垂直切分 + 并行开发策略，使用 wot-design-uni UI组件库，Pinia 状态管理，微信云开发后端。设计系统完全对齐 LeanSkill（轻选Skills），使用 Noto Serif SC 标题字体 + 莫兰迪配色系统。

**Tech Stack:** UniApp 3.0, Vue3, TypeScript, wot-design-uni, Pinia, Alova, TailwindCSS, 微信云开发

---

## 项目文件结构

此计划将创建/修改以下文件：

### 新建文件
- `src/styles/design-tokens.scss` - Design Tokens 变量定义
- `src/styles/global.scss` - 全局样式
- `src/utils/constants.ts` - 常量定义（颜色、标签等）
- `src/utils/format.ts` - 格式化工具函数
- `src/composables/useCache.ts` - 缓存逻辑
- `src/composables/useShare.ts` - 分享功能
- `src/composables/useLogin.ts` - 登录逻辑
- `src/store/user.ts` - 用户状态管理
- `src/store/collection.ts` - 收藏状态管理
- `src/components/CaseCard.vue` - 案例卡片组件
- `src/components/ScoreBadge.vue` - 评分徽章组件
- `src/components/TagMor.vue` - 莫兰迪标签组件
- `src/pages/index/index.vue` - 首页（今日精选Top3）
- `src/pages/case-detail/index.vue` - 案例详情页
- `src/pages/case-detail/index.json` - 详情页配置
- `src/pages/history/index.vue` - 历史榜单页
- `src/pages/history/index.json` - 历史榜单配置
- `src/pages/profile/index.vue` - 个人中心页（重写）
- `src/pages/profile/index.json` - 个人中心配置
- `src/pages/profile/favorites/index.vue` - 我的收藏页
- `src/pages/profile/favorites/index.json` - 收藏页配置

### 修改文件
- `package.json` - 添加 wot-design-uni、Pinia、Alova 依赖
- `src/main.ts` - 初始化 Pinia 和样式
- `src/pages.json` - 更新页面路由配置

---

## Phase 1: 基础框架 + 首页

### Task 1.1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 wot-design-uni UI组件库**

```bash
npm install wot-design-uni@1.3.3
```

Expected: 依赖安装成功，node_modules/wot-design-uni 存在

- [ ] **Step 2: 安装 Pinia 状态管理**

```bash
npm install pinia@2.2.6
```

Expected: 依赖安装成功

- [ ] **Step 3: 安装 Alova HTTP客户端**

```bash
npm install alova@3.2.5 @alova/adapter-uniapp@1.0.2
```

Expected: 依赖安装成功

- [ ] **Step 4: 验证 package.json 更新**

检查 package.json 的 dependencies 是否包含：
```json
{
  "wot-design-uni": "^1.3.3",
  "pinia": "^2.2.6",
  "alova": "^3.2.5",
  "@alova/adapter-uniapp": "^1.0.2"
}
```

Run: `cat package.json | grep -E "(wot-design-uni|pinia|alova)"`

Expected: 输出显示以上4个依赖

- [ ] **Step 5: 提交依赖安装**

```bash
git add package.json package-lock.json
git commit -m "deps: install wot-design-uni, pinia, alova"
```

---

### Task 1.2: 配置 Design Tokens

**Files:**
- Create: `src/styles/design-tokens.scss`
- Create: `src/styles/global.scss`
- Modify: `src/main.ts`

- [ ] **Step 1: 创建 design-tokens.scss**

创建文件 `src/styles/design-tokens.scss`：

```scss
// Design Tokens — 精益副业案例库
// 参考 DESIGN.md 和 LeanSkill 设计系统

:root {
  // Colors
  --color-primary: #1A1A2E;
  --color-secondary: #4A4A68;
  --color-accent: #E94560;
  --color-gold: #F5A623;
  --color-bg: #FAFAF8;
  --color-surface: #FFFFFF;
  --color-border: #E8E6E1;
  --color-muted: #9B9A97;

  // Semantic Colors
  --color-success: #059669;
  --color-warning: #F59E0B;
  --color-error: #DC2626;
  --color-info: #0369A1;

  // Fonts
  --font-display: 'Noto Serif SC', 'Georgia', serif;
  --font-body: 'Noto Sans SC', 'PingFang SC', sans-serif;
  --font-mono: 'Roboto Mono', monospace;

  // Spacing
  --spacing-2xs: 2px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;

  // Border Radius
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  // Shadows
  --shadow-card: 0 2px 12px rgba(26, 26, 46, 0.06);
  --shadow-card-hover: 0 8px 32px rgba(26, 26, 46, 0.12);
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);

  // Transitions
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 250ms ease-out;
}

// Dark Mode
[data-theme="dark"] {
  --color-primary: #FAFAF8;
  --color-secondary: #B8B8B8;
  --color-accent: #FF6B8A;
  --color-gold: #FFC857;
  --color-bg: #1A1A2E;
  --color-surface: #252538;
  --color-border: #3A3A52;
  --color-muted: #6B6B7B;
}

// Tag Colors (莫兰迪色系)
$tag-mor-1-bg: #E8D5C4;
$tag-mor-1-text: #5D4E37;

$tag-mor-2-bg: #D4E2D4;
$tag-mor-2-text: #3D5C3D;

$tag-mor-3-bg: #D5D4E2;
$tag-mor-3-text: #4A4D6E;

$tag-mor-4-bg: #E2D4D5;
$tag-mor-4-text: #6E4A4D;

$tag-mor-5-bg: #DFDBD0;
$tag-mor-5-text: #5C5A4F;

// Rank Badge Gradients
$rank-gold: linear-gradient(180deg, #FBBF24, #F97316);
$rank-silver: linear-gradient(180deg, #94A3B8, #64748B);
$rank-bronze: linear-gradient(180deg, #D4A574, #B8956C);
```

Run: `cat src/styles/design-tokens.scss | head -20`

Expected: 文件内容包含颜色和字体变量定义

- [ ] **Step 2: 创建 global.scss 全局样式**

创建文件 `src/styles/global.scss`：

```scss
// 全局样式
@import './design-tokens.scss';

// 基础重置
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

page {
  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

// 文本选择颜色
::selection {
  background: var(--color-accent);
  color: white;
}

// 滚动条样式
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--color-muted);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-secondary);
}

// 工具类
.bg-bg { background: var(--color-bg); }
.bg-surface { background: var(--color-surface); }
.bg-primary { background: var(--color-primary); }
.bg-accent { background: var(--color-accent); }

.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-accent { color: var(--color-accent); }
.text-muted { color: var(--color-muted); }
.text-gold { color: var(--color-gold); }

.font-display { font-family: var(--font-display); }
.font-body { font-family: var(--font-body); }
.font-mono { font-family: var(--font-mono); }

// 间距工具类
.p-4 { padding: var(--spacing-lg); }
.px-4 { padding-left: var(--spacing-lg); padding-right: var(--spacing-lg); }
.py-3 { padding-top: var(--spacing-md); padding-bottom: var(--spacing-md); }
.mb-4 { margin-bottom: var(--spacing-lg); }
.mt-2 { margin-top: var(--spacing-sm); }
.space-y-3 > view + view { margin-top: var(--spacing-md); }

// Flexbox 工具类
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.gap-2 { gap: var(--spacing-sm); }
.gap-3 { gap: var(--spacing-md); }

// 文本工具类
.text-sm { font-size: 13px; }
.text-xs { font-size: 11px; }
.text-xl { font-size: 20px; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// 阴影工具类
.shadow-card {
  box-shadow: var(--shadow-card);
}

// 圆角工具类
.rounded-2xl {
  border-radius: var(--radius-lg);
}

.rounded-full {
  border-radius: var(--radius-full);
}

// 过渡动画
.transition-colors {
  transition: color var(--transition-base);
}

// 呼吸动画
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

// 边框
.border { border: 1px solid var(--color-border); }
.border-b { border-bottom: 1px solid var(--color-border); }
.border-t { border-top: 1px solid var(--color-border); }

// 最小高度
.min-h-screen { min-height: 100vh; }

// 相对定位
.relative { position: relative; }
.fixed { position: fixed; }

// Z-index
.z-50 { z-index: 50; }

// 宽度
.w-2 { width: 8px; }
.w-16 { width: 64px; }

// Flex
.flex-1 { flex: 1; }

// 块级
.block { display: block; }

// 不透明度
.opacity-70 { opacity: 0.7; }
.opacity-90 { opacity: 0.9; }

// 背景渐变
.bg-gradient-to-br {
  background: linear-gradient(to bottom right, var(--color-primary), var(--color-secondary));
}

.from-\[\\#2D2D44\] {
  --tw-gradient-from: #2D2D44;
}

.to-\[\\#1A1A2E\] {
  --tw-gradient-to: #1A1A2E;
}
```

Run: `cat src/styles/global.scss | head -50`

Expected: 文件内容包含全局样式定义

- [ ] **Step 3: 修改 main.ts 导入样式和 Pinia**

在 `src/main.ts` 文件顶部添加导入：

```typescript
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入全局样式
import './styles/global.scss'

export function createApp() {
  const app = createSSRApp(App)
  
  // 初始化 Pinia
  const pinia = createPinia()
  app.use(pinia)
  
  return {
    app,
    pinia
  }
}
```

修改前原文件应该只包含 Vue 相关代码，修改后需要添加 Pinia 和样式导入。

Run: `cat src/main.ts`

Expected: 输出包含 `import './styles/global.scss'` 和 `app.use(pinia)`

- [ ] **Step 4: 提交 Design Tokens 配置**

```bash
git add src/styles/design-tokens.scss src/styles/global.scss src/main.ts
git commit -m "feat: add design tokens and global styles"
```

---

### Task 1.3: 创建工具函数和常量

**Files:**
- Create: `src/utils/constants.ts`
- Create: `src/utils/format.ts`

- [ ] **Step 1: 创建 constants.ts 常量文件**

创建文件 `src/utils/constants.ts`：

```typescript
// 常量定义

// 颜色常量
export const COLORS = {
  PRIMARY: '#1A1A2E',
  SECONDARY: '#4A4A68',
  ACCENT: '#E94560',
  GOLD: '#F5A623',
  BG: '#FAFAF8',
  SURFACE: '#FFFFFF',
  BORDER: '#E8E6E1',
  MUTED: '#9B9A97',
  SUCCESS: '#059669',
  WARNING: '#F59E0B',
  ERROR: '#DC2626',
  INFO: '#0369A1'
} as const

// 莫兰迪色标签
export const MORANDI_TAGS = [
  { name: 'case-tag-mor-1', bg: '#E8D5C4', text: '#5D4E37' },
  { name: 'case-tag-mor-2', bg: '#D4E2D4', text: '#3D5C3D' },
  { name: 'case-tag-mor-3', bg: '#D5D4E2', text: '#4A4D6E' },
  { name: 'case-tag-mor-4', bg: '#E2D4D5', text: '#6E4A4D' },
  { name: 'case-tag-mor-5', bg: '#DFDBD0', text: '#5C5A4F' }
] as const

// 成本标签颜色
export const COST_TAG_COLORS = {
  '零成本': { bg: '#D1FAE5', text: '#059669' },
  '低门槛': { bg: '#DBEAFE', text: '#2563EB' }
} as const

// 排名徽章颜色
export const RANK_BADGE_COLORS = {
  1: 'linear-gradient(180deg, #FBBF24, #F97316)',
  2: 'linear-gradient(180deg, #94A3B8, #64748B)',
  3: 'linear-gradient(180deg, #D4A574, #B8956C)',
  4: '#FAFAF8'
} as const

// 评分维度（与 DESIGN.md 设计稿完全对齐）
export const SCORE_DIMENSIONS = [
  { key: 'score_feasibility', label: '落地可行性', max: 20 },
  { key: 'score_profit', label: '收益潜力', max: 20 },
  { key: 'score_timeliness', label: '时效性', max: 20 },
  { key: 'score_detail', label: '实操细节', max: 20 },
  { key: 'score_fitness', label: '用户适配度', max: 20 }
] as const

// 缓存键名
export const CACHE_KEYS = {
  DAILY_PICK: 'daily-pick',
  USER_INFO: 'user-info',
  COLLECTIONS: 'collections'
} as const

// 缓存时长（毫秒）
export const CACHE_TTL = {
  HOUR: 3600_000,    // 1小时
  DAY: 86400_000,    // 1天
  WEEK: 604800_000   // 1周
} as const

// 订阅消息模板ID（需要在微信公众平台配置）
export const SUBSCRIBE_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'

// 每页数量
export const PAGE_SIZE = 20
```

Run: `cat src/utils/constants.ts`

Expected: 文件内容包含所有常量定义

- [ ] **Step 2: 创建 format.ts 格式化工具**

创建文件 `src/utils/format.ts`：

```typescript
// 格式化工具函数

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期为 MM-DD
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

/**
 * 格式化金额
 */
export function formatMoney(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0'
  
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`
  }
  return num.toString()
}

/**
 * 格式化数字（每3位加逗号）
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * 获取评分等级
 */
export function getScoreGrade(score: number): string {
  if (score >= 90) return 'S'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

/**
 * 获取评分等级颜色
 */
export function getScoreGradeColor(score: number): string {
  if (score >= 90) return '#059669' // green
  if (score >= 80) return '#F5A623' // gold
  if (score >= 70) return '#F59E0B' // orange
  if (score >= 60) return '#E94560' // red
  return '#9B9A97' // gray
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 计算百分比
 */
export function calculatePercentage(value: number, max: number): string {
  if (max === 0) return '0%'
  return `${Math.round((value / max) * 100)}%`
}

/**
 * 获取当前日期字符串 YYYY-MM-DD
 */
export function getCurrentDate(): string {
  return formatDate(new Date())
}

/**
 * 判断是否为今天
 */
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return formatDate(d)
}
```

Run: `cat src/utils/format.ts`

Expected: 文件内容包含所有格式化函数

- [ ] **Step 3: 提交工具函数**

```bash
git add src/utils/constants.ts src/utils/format.ts
git commit -m "feat: add constants and format utilities"
```

---

**Phase 1 进行中...继续添加下一部分**

---

### Task 1.4: 创建 Composables

**Files:**
- Create: `src/composables/useCache.ts`
- Create: `src/composables/useShare.ts`
- Create: `src/composables/useLogin.ts`

- [ ] **Step 1: 创建 useCache.ts 缓存逻辑**

创建文件 `src/composables/useCache.ts`：

```typescript
import { CACHE_KEYS, CACHE_TTL } from '@/utils/constants'

const CACHE_PREFIX = 'leanstartup_cache_'

interface CacheData<T = any> {
  data: T
  expiry: number
}

export function useCache() {
  /**
   * 设置缓存
   */
  const setCache = <T>(key: string, data: T, ttl: number): void => {
    const expiry = Date.now() + ttl
    const cacheData: CacheData<T> = { data, expiry }
    uni.setStorageSync(CACHE_PREFIX + key, JSON.stringify(cacheData))
  }

  /**
   * 获取缓存
   */
  const getCache = <T = any>(key: string): T | null => {
    try {
      const raw = uni.getStorageSync(CACHE_PREFIX + key)
      if (!raw) return null
      
      const cacheData: CacheData<T> = JSON.parse(raw)
      
      // 检查是否过期
      if (Date.now() > cacheData.expiry) {
        uni.removeStorageSync(CACHE_PREFIX + key)
        return null
      }
      
      return cacheData.data
    } catch (e) {
      console.error('Cache get error:', e)
      return null
    }
  }

  /**
   * 带缓存的请求
   */
  const fetchWithCache = async <T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.HOUR
  ): Promise<T> => {
    // 先尝试从缓存获取
    const cached = getCache<T>(key)
    if (cached !== null) {
      console.log(`[Cache Hit] ${key}`)
      return cached
    }
    
    // 缓存未命中，发起请求
    console.log(`[Cache Miss] ${key}`)
    const data = await fetcher()
    setCache(key, data, ttl)
    return data
  }

  /**
   * 清除指定缓存
   */
  const clearCache = (key?: string): void => {
    if (key) {
      uni.removeStorageSync(CACHE_PREFIX + key)
    } else {
      // 清除所有缓存
      const allKeys = uni.getStorageInfoSync().keys
      allKeys.forEach(k => {
        if (k.startsWith(CACHE_PREFIX)) {
          uni.removeStorageSync(k)
        }
      })
    }
  }

  /**
   * 清除所有过期缓存
   */
  const clearExpiredCache = (): void => {
    const allKeys = uni.getStorageInfoSync().keys
    const now = Date.now()
    
    allKeys.forEach(k => {
      if (k.startsWith(CACHE_PREFIX)) {
        try {
          const raw = uni.getStorageSync(k)
          const cacheData: CacheData = JSON.parse(raw)
          if (now > cacheData.expiry) {
            uni.removeStorageSync(k)
          }
        } catch (e) {
          // 解析失败，删除该缓存
          uni.removeStorageSync(k)
        }
      }
    })
  }

  return {
    setCache,
    getCache,
    fetchWithCache,
    clearCache,
    clearExpiredCache
  }
}
```

Run: `cat src/composables/useCache.ts | wc -l`

Expected: 输出行数大于80，文件创建成功

- [ ] **Step 2: 创建 useShare.ts 分享功能**

创建文件 `src/composables/useShare.ts`：

```typescript
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

interface ShareConfig {
  title?: string
  path?: string
  imageUrl?: string
}

/**
 * 分享功能 Composable
 */
export function useShare(customShare?: ShareConfig) {
  const defaultShare = {
    title: '精益副业案例库 - 每日精选副业案例',
    path: '/pages/index/index',
    imageUrl: '' // 可设置默认分享图片
  }

  /**
   * 配置分享给朋友
   */
  onShareAppMessage(() => {
    return {
      title: customShare?.title || defaultShare.title,
      path: customShare?.path || defaultShare.path,
      imageUrl: customShare?.imageUrl || defaultShare.imageUrl
    }
  })

  /**
   * 配置分享到朋友圈
   */
  onShareTimeline(() => {
    return {
      title: customShare?.title || defaultShare.title,
      query: '',
      imageUrl: customShare?.imageUrl || defaultShare.imageUrl
    }
  })

  /**
   * 触发分享（小程序会自动处理）
   */
  const triggerShare = () => {
    // 微信小程序会自动调用 onShareAppMessage
    console.log('[Share] Share triggered')
  }

  return {
    triggerShare
  }
}
```

Run: `cat src/composables/useShare.ts`

Expected: 文件内容包含分享功能逻辑

- [ ] **Step 3: 创建 useLogin.ts 登录逻辑**

创建文件 `src/composables/useLogin.ts`：

```typescript
import { ref, computed } from 'vue'
import { useUserStore } from '@/store'

/**
 * 登录功能 Composable
 */
export function useLogin() {
  const userStore = useUserStore()
  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const isLoading = ref(false)

  /**
   * 确保用户已登录
   * 如果未登录，显示登录确认弹窗
   */
  const ensureLoggedIn = async (): Promise<boolean> => {
    if (isLoggedIn.value) {
      return true
    }

    return new Promise((resolve) => {
      uni.showModal({
        title: '需要登录',
        content: '请先登录以使用此功能',
        confirmText: '去登录',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            isLoading.value = true
            try {
              await userStore.login()
              resolve(true)
            } catch (e) {
              console.error('[Login] Login failed:', e)
              uni.showToast({
                title: '登录失败',
                icon: 'none'
              })
              resolve(false)
            } finally {
              isLoading.value = false
            }
          } else {
            resolve(false)
          }
        }
      })
    })
  }

  /**
   * 登录并执行回调
   */
  const loginAndDo = async (callback: () => void | Promise<void>): Promise<boolean> => {
    const loggedIn = await ensureLoggedIn()
    if (loggedIn) {
      await callback()
      return true
    }
    return false
  }

  return {
    isLoggedIn,
    isLoading,
    ensureLoggedIn,
    loginAndDo
  }
}
```

Run: `cat src/composables/useLogin.ts`

Expected: 文件内容包含登录逻辑

- [ ] **Step 4: 提交 Composables**

```bash
git add src/composables/
git commit -m "feat: add useCache, useShare, useLogin composables"
```

---

### Task 1.5: 创建 Pinia Store

**Files:**
- Create: `src/store/user.ts`
- Create: `src/store/collection.ts`
- Create: `src/store/index.ts`

- [ ] **Step 1: 创建 store/index.ts**

创建文件 `src/store/index.ts`：

```typescript
import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// 导出所有 store
export * from './user'
export * from './collection'
```

Run: `cat src/store/index.ts`

Expected: 文件创建成功

- [ ] **Step 2: 创建 user.ts 用户状态管理**

创建文件 `src/store/user.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface UserInfo {
  id: string
  openid: string
  name?: string
  avatar?: string
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<UserInfo | null>(null)
  const isLoggedIn = ref(false)
  const favoritesCount = ref(0)
  const viewedRankingsCount = ref(0)

  /**
   * 登录
   */
  const login = async (wechatUserInfo?: any): Promise<void> => {
    uni.showLoading({ title: '登录中...', mask: true })
    
    try {
      // 调用云函数获取 openid
      const res = await wx.cloud.callFunction({
        name: 'getDailyPick', // 使用现有云函数获取用户信息
        data: { action: 'getUserInfo' }
      })

      if (res.result.errCode === 0) {
        userInfo.value = res.result.data.userInfo
        isLoggedIn.value = true
        await fetchProfile()
        
        uni.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        throw new Error(res.result.errMsg)
      }
    } catch (e: any) {
      console.error('[User] Login failed:', e)
      uni.showToast({
        title: e.message || '登录失败',
        icon: 'none'
      })
      throw e
    } finally {
      uni.hideLoading()
    }
  }

  /**
   * 获取用户资料
   */
  const fetchProfile = async (): Promise<void> => {
    if (!isLoggedIn.value) return

    try {
      // 调用云函数获取用户统计数据
      const [collectionsRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'getUserCollections',
          data: { page: 1, pageSize: 1 }
        })
      ])

      favoritesCount.value = collectionsRes.result.data?.total || 0
      // viewedRankingsCount 需要从本地存储获取
      const viewed = uni.getStorageSync('viewed_rankings') || []
      viewedRankingsCount.value = viewed.length
    } catch (e) {
      console.error('[User] Fetch profile failed:', e)
    }
  }

  /**
   * 退出登录
   */
  const logout = (): void => {
    userInfo.value = null
    isLoggedIn.value = false
    favoritesCount.value = 0
    viewedRankingsCount.value = 0
    
    // 清除本地存储的用户相关数据
    uni.removeStorageSync('user_info')
    uni.removeStorageSync('viewed_rankings')
  }

  /**
   * 更新用户信息
   */
  const updateUserInfo = async (updates: Partial<UserInfo>): Promise<{ success: boolean; message?: string }> => {
    try {
      // 这里可以添加更新用户信息的云函数调用
      userInfo.value = { ...userInfo.value, ...updates } as UserInfo
      return { success: true }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  }

  /**
   * 增加已阅榜单计数
   */
  const incrementViewedCount = (): void => {
    viewedRankingsCount.value++
  }

  return {
    userInfo,
    isLoggedIn,
    favoritesCount,
    viewedRankingsCount,
    login,
    fetchProfile,
    logout,
    updateUserInfo,
    incrementViewedCount
  }
})
```

Run: `cat src/store/user.ts | wc -l`

Expected: 文件包含完整的用户状态管理逻辑

- [ ] **Step 3: 创建 collection.ts 收藏状态管理**

创建文件 `src/store/collection.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface CollectionItem {
  _id: string
  caseId: string
  status: 'collected' | 'doing' | 'done'
  progress: number
  createdAt: string
}

export const useCollectionStore = defineStore('collection', () => {
  const collections = ref<string[]>([]) // 存储已收藏的 caseId
  const isLoading = ref(false)
  const hasMore = ref(true)
  const currentPage = ref(1)

  /**
   * 获取收藏列表
   */
  const fetchCollections = async (page: number = 1, pageSize: number = 20): Promise<void> => {
    if (isLoading.value) return

    isLoading.value = true
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getUserCollections',
        data: { page, pageSize }
      })

      if (res.result.errCode === 0) {
        const list = res.result.data.list || []
        
        if (page === 1) {
          collections.value = list.map((item: CollectionItem) => item.caseId)
        } else {
          collections.value.push(...list.map((item: CollectionItem) => item.caseId))
        }

        hasMore.value = list.length === pageSize
        currentPage.value = page
      }
    } catch (e) {
      console.error('[Collection] Fetch failed:', e)
      uni.showToast({
        title: '获取收藏失败',
        icon: 'none'
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 切换收藏状态
   */
  const toggleCollection = async (caseId: string): Promise<boolean> => {
    try {
      const res = await wx.cloud.callFunction({
        name: 'toggleCollection',
        data: { caseId, action: 'toggle' }
      })

      if (res.result.errCode === 0) {
        const collected = res.result.data.collected
        
        if (collected) {
          collections.value.push(caseId)
        } else {
          collections.value = collections.value.filter(id => id !== caseId)
        }

        return collected
      }
      
      return false
    } catch (e) {
      console.error('[Collection] Toggle failed:', e)
      uni.showToast({
        title: '操作失败',
        icon: 'none'
      })
      return false
    }
  }

  /**
   * 检查是否已收藏
   */
  const isCollected = (caseId: string): boolean => {
    return collections.value.includes(caseId)
  }

  /**
   * 加载更多
   */
  const loadMore = async (): Promise<void> => {
    if (!hasMore.value || isLoading.value) return
    await fetchCollections(currentPage.value + 1)
  }

  /**
   * 刷新
   */
  const refresh = async (): Promise<void> => {
    await fetchCollections(1)
  }

  return {
    collections,
    isLoading,
    hasMore,
    currentPage,
    fetchCollections,
    toggleCollection,
    isCollected,
    loadMore,
    refresh
  }
})
```

Run: `cat src/store/collection.ts | wc -l`

Expected: 文件包含完整的收藏状态管理逻辑

- [ ] **Step 4: 提交 Pinia Store**

```bash
git add src/store/
git commit -m "feat: add user and collection Pinia stores"
```

---

### Task 1.6: 创建公共组件

**Files:**
- Create: `src/components/CaseCard.vue`
- Create: `src/components/ScoreBadge.vue`
- Create: `src/components/TagMor.vue`

- [ ] **Step 1: 创建 CaseCard.vue 案例卡片组件**

创建文件 `src/components/CaseCard.vue`：

```vue
<template>
  <view 
    class="case-card bg-surface rounded-2xl p-4 shadow-card"
    :class="{ 'is-active': isActive }"
    @click="handleClick"
  >
    <!-- 左侧排名徽章 -->
    <view class="case-card__rank" :style="{ background: rankColor }">
      <text class="case-card__rank-text">{{ rank }}</text>
    </view>

    <!-- 右侧内容 -->
    <view class="case-card__content">
      <!-- 标题 -->
      <text class="case-card__title font-display">{{ case.title }}</text>
      
      <!-- 评分和标签 -->
      <view class="case-card__meta">
        <view class="case-card__score">
          <text class="case-card__score-star">★</text>
          <text class="case-card__score-value font-mono">{{ case.score_total }}</text>
        </view>
        
        <!-- 成本标签 -->
        <view 
          class="case-card__tag"
          :style="{ background: costTagColor.bg, color: costTagColor.text }"
        >
          <text class="case-card__tag-text">{{ case.cost }}</text>
        </view>
      </view>

      <!-- 摘要 -->
      <text class="case-card__summary text-secondary">{{ case.summary }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RANK_BADGE_COLORS, COST_TAG_COLORS } from '@/utils/constants'

interface Props {
  case: {
    id: string
    title: string
    summary: string
    score_total: number
    cost: string
  }
  rank: number
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<{
  click: [caseId: string]
}>()

const rankColor = computed(() => {
  if (props.rank <= 3) {
    return RANK_BADGE_COLORS[props.rank as 1 | 2 | 3]
  }
  return '#FAFAF8'
})

const costTagColor = computed(() => {
  return COST_TAG_COLORS[props.cost as keyof typeof COST_TAG_COLORS] || {
    bg: '#FAFAF8',
    text: '#4A4A68'
  }
})

const handleClick = () => {
  emit('click', props.case.id)
}
</script>

<style scoped>
.case-card {
  display: flex;
  gap: 12px;
  transition: all var(--transition-base);
  cursor: pointer;
}

.case-card:active {
  transform: scale(0.99);
}

.case-card__rank {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.case-card__rank-text {
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.case-card__content {
  flex: 1;
  min-width: 0;
}

.case-card__title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.case-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.case-card__score {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #FFF8E1;
  padding: 2px 8px;
  border-radius: 12px;
}

.case-card__score-star {
  font-size: 12px;
  color: #F5A623;
}

.case-card__score-value {
  font-size: 12px;
  font-weight: 700;
  color: #F5A623;
}

.case-card__tag {
  padding: 2px 8px;
  border-radius: 12px;
}

.case-card__tag-text {
  font-size: 11px;
  font-weight: 600;
}

.case-card__summary {
  display: block;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
```

Run: `cat src/components/CaseCard.vue | head -50`

Expected: 文件内容包含案例卡片组件代码

- [ ] **Step 2: 创建 ScoreBadge.vue 评分徽章组件**

创建文件 `src/components/ScoreBadge.vue`：

```vue
<template>
  <view class="score-badge" :class="`score-badge--${grade}`">
    <text class="score-badge__score font-mono">{{ Math.floor(score) }}</text>
    <text class="score-badge__decimal font-mono">.{{ decimal }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getScoreGrade } from '@/utils/format'

interface Props {
  score: number
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
})

const grade = computed(() => getScoreGrade(props.score))
const decimal = computed(() => {
  const dec = (props.score % 1).toFixed(1)
  return dec.substring(2)
})
</script>

<style scoped>
.score-badge {
  display: inline-flex;
  align-items: baseline;
  padding: 4px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #F5A623, #FF8C00);
  box-shadow: 0 2px 4px rgba(245, 166, 35, 0.3);
}

.score-badge__score {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.score-badge__decimal {
  font-size: 12px;
  font-weight: 700;
  color: white;
  opacity: 0.9;
}

/* 等级样式 */
.score-badge--S {
  background: linear-gradient(135deg, #059669, #10B981);
}

.score-badge--A {
  background: linear-gradient(135deg, #F5A623, #FF8C00);
}

.score-badge--B {
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
}

.score-badge--C {
  background: linear-gradient(135deg, #E94560, #FF6B8A);
}

.score-badge--D {
  background: linear-gradient(135deg, #9B9A97, #B8B8B8);
}
</style>
```

Run: `cat src/components/ScoreBadge.vue`

Expected: 文件内容包含评分徽章组件代码

- [ ] **Step 3: 创建 TagMor.vue 莫兰迪标签组件**

创建文件 `src/components/TagMor.vue`：

```vue
<template>
  <view 
    class="tag-mor"
    :style="{ 
      background: tag.bg, 
      color: tag.text 
    }"
  >
    <text class="tag-mor__text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MORANDI_TAGS } from '@/utils/constants'

interface Props {
  text: string
  variant?: 1 | 2 | 3 | 4 | 5
}

const props = withDefaults(defineProps<Props>(), {
  variant: 1
})

const tag = computed(() => {
  return MORANDI_TAGS[props.variant - 1]
})
</script>

<style scoped>
.tag-mor {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

.tag-mor__text {
  font-size: 11px;
}
</style>
```

Run: `cat src/components/TagMor.vue`

Expected: 文件内容包含莫兰迪标签组件代码

- [ ] **Step 4: 提交公共组件**

```bash
git add src/components/
git commit -m "feat: add CaseCard, ScoreBadge, TagMor components"
```

---

**Phase 1 继续中...首页实现即将添加**

---

### Task 1.7: 实现首页（今日精选Top3）

**Files:**
- Modify: `src/pages/index/index.vue`
- Modify: `src/pages.json`

- [ ] **Step 1: 更新首页组件**

完全替换 `src/pages/index/index.vue` 文件内容：

```vue
<template>
  <view class="home-page bg-bg min-h-screen pb-20">
    <!-- 顶部大标题区（按设计稿 .page-hero） -->
    <view class="page-hero">
      <text class="page-hero-title">搞钱案例榜</text>
      <text class="page-hero-slogan">每日 3 个可落地副业案例</text>
    </view>

    <!-- 顶部导航栏 -->
    <view class="home-page__header px-4 py-2 flex items-center justify-between bg-surface border-b">
      <view class="flex items-center gap-2">
        <view class="w-2 h-2 rounded-full bg-accent animate-pulse"></view>
        <text class="text-sm font-semibold">今日精选</text>
      </view>
      <text class="text-xs text-secondary">{{ currentDate }}</text>
    </view>

    <!-- 案例列表 -->
    <view class="home-page__list px-4 py-3 space-y-3">
      <view 
        v-for="(item, index) in todayCases" 
        :key="item.id"
        class="bg-surface rounded-2xl p-4 shadow-card"
        @click="goToDetail(item.id)"
      >
        <!-- 排行卡片布局 -->
        <view class="flex gap-3">
          <!-- 排名徽章 -->
          <view 
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="{ background: getRankColor(index + 1) }"
          >
            <text class="text-sm font-bold text-white">{{ index + 1 }}</text>
          </view>

          <!-- 内容区 -->
          <view class="flex-1 min-w-0">
            <text class="block text-base font-semibold font-display leading-tight mb-2 line-clamp-2">
              {{ item.title }}
            </text>

            <!-- 评分和标签 -->
            <view class="flex items-center gap-2 mb-2">
              <view class="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                <text class="text-xs text-yellow-600">★</text>
                <text class="text-xs font-bold font-mono text-yellow-600">{{ item.score_total }}</text>
              </view>
              <view 
                class="px-2 py-0.5 rounded-full"
                :style="{ 
                  background: getCostTagColor(item.cost).bg, 
                  color: getCostTagColor(item.cost).text 
                }"
              >
                <text class="text-xs font-semibold">{{ item.cost }}</text>
              </view>
            </view>

            <!-- 摘要 -->
            <text class="block text-sm text-secondary line-clamp-2">{{ item.summary }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="todayCases.length === 0 && !loading" class="text-center py-12">
        <text class="text-muted">暂无精选案例</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="text-center py-12">
        <wd-loading type="circular" />
        <text class="text-xs text-secondary mt-2 block">加载中...</text>
      </view>
    </view>

    <!-- 订阅横幅（带 shimmer 动画） -->
    <view class="mx-4 mt-2 home-subscribe-banner rounded-2xl p-5">
      <view class="home-subscribe-text flex items-center justify-between">
        <view class="flex-1">
          <text class="home-subscribe-title block mb-1">每日推送</text>
          <text class="text-sm text-white/90">不错过每一个精彩案例</text>
        </view>
        <wd-button
          type="success"
          custom-class="!bg-white !text-accent !rounded-full !px-4"
          @click="handleSubscribe"
        >
          立即订阅
        </wd-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCache } from '@/composables/useCache'
import { getCurrentDate } from '@/utils/format'
import { RANK_BADGE_COLORS, COST_TAG_COLORS, SUBSCRIBE_TEMPLATE_ID } from '@/utils/constants'

interface CaseItem {
  id: string
  title: string
  summary: string
  score_total: number
  cost: string
}

const todayCases = ref<CaseItem[]>([])
const loading = ref(false)

const currentDate = computed(() => getCurrentDate())

const { fetchWithCache, clearCache } = useCache()

/**
 * 获取今日精选
 */
const fetchTodayCases = async () => {
  loading.value = true
  
  try {
    // 调用云函数获取今日精选
    const res = await wx.cloud.callFunction({
      name: 'getDailyPick'
    })

    if (res.result.errCode === 0) {
      todayCases.value = res.result.data.cases || []
    } else {
      uni.showToast({
        title: res.result.errMsg || '获取失败',
        icon: 'none'
      })
    }
  } catch (e) {
    console.error('[Home] Fetch failed:', e)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 下拉刷新
 */
const onRefresh = async () => {
  clearCache('daily-pick')
  await fetchTodayCases()
  uni.stopPullDownRefresh()
}

onMounted(async () => {
  // 使用缓存获取数据（1小时缓存）
  try {
    const data = await fetchWithCache('daily-pick', fetchTodayCases, 3600_000)
    todayCases.value = data.cases || []
  } catch (e) {
    console.error('[Home] Cache fetch failed:', e)
    await fetchTodayCases()
  }
})

/**
 * 跳转到详情页
 */
const goToDetail = (caseId: string) => {
  uni.navigateTo({
    url: `/pages/case-detail/index?id=${caseId}`
  })
}

/**
 * 获取排名颜色
 */
const getRankColor = (rank: number): string => {
  if (rank <= 3) {
    return RANK_BADGE_COLORS[rank as 1 | 2 | 3]
  }
  return '#FAFAF8'
}

/**
 * 获取成本标签颜色
 */
const getCostTagColor = (cost: string) => {
  return COST_TAG_COLORS[cost as keyof typeof COST_TAG_COLORS] || {
    bg: '#FAFAF8',
    text: '#4A4A68'
  }
}

/**
 * 处理订阅
 */
const handleSubscribe = async () => {
  uni.requestSubscribeMessage({
    tmplIds: [SUBSCRIBE_TEMPLATE_ID],
    success: (res) => {
      if (res[SUBSCRIBE_TEMPLATE_ID] === 'accept') {
        // 调用云函数记录订阅
        wx.cloud.callFunction({
          name: 'subscribeMessage',
          data: { action: 'subscribe' }
        }).then(() => {
          uni.showToast({
            title: '订阅成功',
            icon: 'success'
          })
        }).catch(() => {
          uni.showToast({
            title: '订阅失败',
            icon: 'none'
          })
        })
      }
    },
    fail: () => {
      uni.showToast({
        title: '订阅失败',
        icon: 'none'
      })
    }
  })
}

// 暴露下拉刷新方法
defineExpose({
  onRefresh
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.space-y-3 > view + view {
  margin-top: 12px;
}

/* 顶部大标题（按设计稿 .page-hero） */
.page-hero {
  padding: 20px 18px 12px;
  text-align: center;
}
.page-hero-title {
  display: block;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}
.page-hero-slogan {
  display: block;
  font-size: 13px;
  color: var(--color-secondary);
}

/* 订阅横幅 + shimmer 动画 */
.home-subscribe-banner {
  position: relative;
  background: linear-gradient(135deg, var(--color-accent), #FF6B8A);
  overflow: hidden;
}
.home-subscribe-banner::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%);
  animation: shimmer 3s ease-in-out infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.home-subscribe-text {
  position: relative;
  z-index: 1;
}
.home-subscribe-title {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
</style>
```

Run: `cat src/pages/index/index.vue | wc -l`

Expected: 文件包含完整的首页组件代码

- [ ] **Step 2: 更新 pages.json 配置首页**

在 `src/pages.json` 中更新首页配置：

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "精益副业案例库",
        "navigationBarBackgroundColor": "#FAFAF8",
        "navigationBarTextStyle": "black",
        "backgroundColor": "#FAFAF8",
        "enablePullDownRefresh": true
      }
    },
    {
      "path": "pages/case-detail/index",
      "style": {
        "navigationBarTitleText": "案例详情",
        "navigationBarBackgroundColor": "#FAFAF8",
        "navigationBarTextStyle": "black"
      }
    },
    {
      "path": "pages/history/index",
      "style": {
        "navigationBarTitleText": "历史榜单",
        "navigationBarBackgroundColor": "#FAFAF8",
        "navigationBarTextStyle": "black"
      }
    },
    {
      "path": "pages/profile/index",
      "style": {
        "navigationBarTitleText": "我的",
        "navigationBarBackgroundColor": "#1A1A2E",
        "navigationBarTextStyle": "white"
      }
    },
    {
      "path": "pages/profile/favorites/index",
      "style": {
        "navigationBarTitleText": "我的收藏",
        "navigationBarBackgroundColor": "#FAFAF8",
        "navigationBarTextStyle": "black"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "精益副业案例库",
    "navigationBarBackgroundColor": "#FAFAF8",
    "backgroundColor": "#FAFAF8"
  },
  "tabBar": {
    "color": "#9B9A97",
    "selectedColor": "#E94560",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "static/tabbar/home.png",
        "selectedIconPath": "static/tabbar/home-active.png"
      },
      {
        "pagePath": "pages/history/index",
        "text": "榜单",
        "iconPath": "static/tabbar/history.png",
        "selectedIconPath": "static/tabbar/history-active.png"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的",
        "iconPath": "static/tabbar/profile.png",
        "selectedIconPath": "static/tabbar/profile-active.png"
      }
    ]
  },
  "easycom": {
    "autoscan": true,
    "custom": {
      "^wd-(.*)": "wot-design-uni/components/wd-$1/wd-$1.vue"
    }
  }
}
```

Run: `cat src/pages.json`

Expected: pages.json 包含完整的页面和 TabBar 配置

- [ ] **Step 3: 添加 TabBar 图标资源**

需要下载/创建 TabBar 图标文件到 `src/static/tabbar/`：
- home.png
- home-active.png
- history.png
- history-active.png
- profile.png
- profile-active.png

使用 `downloadRemoteFile` 工具下载图标：

```bash
# 下载首页图标
调用 downloadRemoteFile 下载合适的图标到 src/static/tabbar/home.png
调用 downloadRemoteFile 下载合适的图标到 src/static/tabbar/home-active.png
# ... 其他图标类似
```

或者创建占位图标，后续替换。

Run: `ls -la src/static/tabbar/`

Expected: 目录包含6个图标文件

- [ ] **Step 4: 提交首页实现**

```bash
git add src/pages/index/index.vue src/pages.json src/static/tabbar/
git commit -m "feat: implement home page with today's top 3 cases"
```

---

## Phase 2: 案例详情页

### Task 2.1: 创建案例详情页

**Files:**
- Create: `src/pages/case-detail/index.vue`
- Create: `src/pages/case-detail/index.json`

- [ ] **Step 1: 创建案例详情页配置**

创建文件 `src/pages/case-detail/index.json`：

```json
{
  "navigationBarTitleText": "案例详情",
  "navigationBarBackgroundColor": "#FAFAF8",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#FAFAF8"
}
```

Run: `cat src/pages/case-detail/index.json`

Expected: 文件创建成功

- [ ] **Step 2: 创建案例详情页组件**

创建文件 `src/pages/case-detail/index.vue`：

```vue
<template>
  <view class="detail-page bg-bg min-h-screen pb-24">
    <!-- 加载状态 -->
    <view v-if="loading" class="flex items-center justify-center min-h-screen">
      <wd-loading type="circular" />
    </view>

    <!-- 详情内容 -->
    <view v-else-if="caseDetail">
      <!-- 评分区域 -->
      <view class="detail-page__score px-4 pt-4 pb-6 bg-surface rounded-b-2xl shadow-card">
        <view class="flex items-baseline gap-2 mb-4">
          <text class="text-5xl font-bold font-mono text-gold">{{ caseDetail.score_total }}</text>
          <text class="text-sm text-secondary">AI评分</text>
        </view>

        <!-- 维度评分进度条 -->
        <view class="space-y-2">
          <view 
            v-for="dim in scoreDimensions" 
            :key="dim.key" 
            class="flex items-center gap-3"
          >
            <text class="text-xs w-12 text-secondary">{{ dim.label }}</text>
            <view class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <view 
                class="h-full bg-accent rounded-full transition-all duration-300"
                :style="{ width: `${(caseDetail[dim.key] / dim.max) * 100}%` }"
              ></view>
            </view>
            <text class="text-xs font-mono w-6 text-right text-secondary">{{ caseDetail[dim.key] }}</text>
          </view>
        </view>
      </view>

      <!-- 内容区域 -->
      <view class="detail-page__content px-4 py-4">
        <!-- 标题和摘要 -->
        <view class="mb-6">
          <text class="block text-xl font-bold font-display leading-tight mb-2">{{ caseDetail.title }}</text>
          <text class="text-sm text-secondary leading-relaxed">{{ caseDetail.summary }}</text>
        </view>

        <!-- 案例故事（浅蓝引用框） -->
        <view v-if="caseDetail.story" class="detail-story mb-4">
          <text class="text-sm text-secondary leading-relaxed">{{ caseDetail.story }}</text>
        </view>

        <!-- 基础信息 -->
        <view class="bg-surface rounded-2xl p-4 mb-4 shadow-card">
          <view class="grid grid-cols-2 gap-4">
            <view class="flex items-center gap-2">
              <text class="text-lg">💰</text>
              <view>
                <text class="text-xs text-secondary block">预期收益</text>
                <text class="text-sm font-semibold">{{ caseDetail.expected_revenue }}</text>
              </view>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-lg">⏱️</text>
              <view>
                <text class="text-xs text-secondary block">启动周期</text>
                <text class="text-sm font-semibold">{{ caseDetail.cycle }}</text>
              </view>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-lg">💵</text>
              <view>
                <text class="text-xs text-secondary block">成本</text>
                <text class="text-sm font-semibold">{{ caseDetail.cost }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 工具/资源（2列网格） -->
        <view v-if="caseDetail.tools && caseDetail.tools.length > 0" class="bg-surface rounded-2xl p-4 mb-4 shadow-card">
          <text class="text-xs font-bold text-secondary mb-3 block">工具/资源</text>
          <view class="detail-tools-grid">
            <view v-for="tool in caseDetail.tools" :key="tool.name" class="detail-tool-item">
              <text class="detail-tool-name">{{ tool.name }}</text>
              <text class="detail-tool-desc">{{ tool.desc }}</text>
            </view>
          </view>
        </view>

        <!-- 避坑指南（橙色警告框） -->
        <view v-if="caseDetail.pitfall" class="detail-pitfall-box mb-4">
          <view class="flex items-center gap-1 mb-2">
            <text class="text-sm">⚠️</text>
            <text class="text-xs font-bold" style="color:#E65100">避坑指南</text>
          </view>
          <text class="text-xs" style="color:#BF360C;line-height:1.6">{{ caseDetail.pitfall }}</text>
        </view>

        <!-- 风险标签（红色 pill） -->
        <view v-if="caseDetail.risk_tags && caseDetail.risk_tags.length > 0" class="detail-risk-tags mb-4">
          <view v-for="tag in caseDetail.risk_tags" :key="tag" class="detail-risk-tag">
            <text class="text-xs">{{ tag }}</text>
          </view>
        </view>

        <!-- 来源信息 -->
        <view class="bg-surface rounded-2xl p-4 shadow-card">
          <text class="text-xs text-secondary">来源：{{ caseDetail.source_account }}</text>
        </view>
      </view>
    </view>

    <!-- 错误状态 -->
    <view v-else class="flex items-center justify-center min-h-screen">
      <text class="text-muted">案例不存在</text>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-surface border-t px-4 py-3 flex gap-3 z-50">
      <wd-button 
        type="success" 
        plain 
        block 
        :loading="collectionLoading"
        @click="handleToggleCollection"
      >
        {{ isCollected ? '已收藏' : '收藏' }}
      </wd-button>
      <wd-button 
        type="primary" 
        plain 
        block 
        custom-class="!border-accent !text-accent"
        @click="handleShare"
      >
        分享
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useShare } from '@/composables/useShare'
import { useLogin } from '@/composables/useLogin'
import { useCollectionStore } from '@/store'
import { storeToRefs } from 'pinia'
import { SCORE_DIMENSIONS } from '@/utils/constants'

interface CaseDetail {
  id: string
  title: string
  summary: string
  story?: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  expected_revenue: string
  cycle: string
  cost: string
  tools?: { name: string; desc: string }[]
  pitfall?: string
  risk_tags?: string[]
  source_account: string
}

const caseDetail = ref<CaseDetail | null>(null)
const loading = ref(true)
const collectionLoading = ref(false)

const scoreDimensions = SCORE_DIMENSIONS

// 获取案例ID
const caseId = computed(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = currentPage.options || {}
  return options.id as string
})

// 分享配置
const { triggerShare } = useShare({
  title: caseDetail.value?.title || '精选副业案例',
  path: `/pages/case-detail/index?id=${caseId.value}`
})

// 收藏功能
const collectionStore = useCollectionStore()
const { isCollected } = storeToRefs(collectionStore)

const { ensureLoggedIn } = useLogin()

/**
 * 获取案例详情
 */
const fetchCaseDetail = async () => {
  loading.value = true
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'getCaseDetail',
      data: { caseId: caseId.value }
    })

    if (res.result.errCode === 0) {
      caseDetail.value = res.result.data
    } else {
      uni.showToast({
        title: res.result.errMsg || '获取失败',
        icon: 'none'
      })
    }
  } catch (e) {
    console.error('[Detail] Fetch failed:', e)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

/**
 * 切换收藏状态
 */
const handleToggleCollection = async () => {
  const loggedIn = await ensureLoggedIn()
  if (!loggedIn) return

  collectionLoading.value = true
  
  try {
    await collectionStore.toggleCollection(caseId.value)
  } finally {
    collectionLoading.value = false
  }
}

/**
 * 分享
 */
const handleShare = () => {
  triggerShare()
}

onMounted(() => {
  fetchCaseDetail()
})
</script>

<style scoped>
.space-y-2 > view + view {
  margin-top: 8px;
}

/* 案例故事（浅蓝引用框） */
.detail-story {
  background: linear-gradient(135deg, #F0F9FF, #E0F2FE);
  border: 1px solid #BAE6FD;
  border-radius: var(--radius-md);
  padding: 16px;
}

/* 工具网格 */
.detail-tools-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.detail-tool-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-tool-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}
.detail-tool-desc {
  font-size: 11px;
  color: var(--color-muted);
}

/* 避坑指南（橙色警告框） */
.detail-pitfall-box {
  background: #FFF3E0;
  border: 1px solid #FFE0B2;
  border-radius: var(--radius-md);
  padding: 16px;
}

/* 风险标签（红色 pill） */
.detail-risk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.detail-risk-tag {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #FEE2E2;
  color: #DC2626;
  font-size: 11px;
  font-weight: 600;
}
</style>
```

Run: `cat src/pages/case-detail/index.vue | wc -l`

Expected: 文件包含完整的详情页代码

- [ ] **Step 3: 提交详情页**

```bash
git add src/pages/case-detail/
git commit -m "feat: implement case detail page with score visualization"
```

---

**Phase 2 完成...Phase 3-5 继续添加中**

---

## Phase 3: 历史榜单页 + 个人中心页

### Task 3.1: 创建历史榜单页

**Files:**
- Create: `src/pages/history/index.vue`
- Create: `src/pages/history/index.json`

- [ ] **Step 1: 创建历史榜单页配置**

创建文件 `src/pages/history/index.json`：

```json
{
  "navigationBarTitleText": "历史榜单",
  "navigationBarBackgroundColor": "#FAFAF8",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#FAFAF8",
  "enablePullDownRefresh": true
}
```

- [ ] **Step 2: 创建历史榜单页组件**

创建文件 `src/pages/history/index.vue`：

```vue
<template>
  <view class="history-page bg-bg min-h-screen">
    <!-- 顶部导航 -->
    <view class="history-page__header px-4 py-3 flex items-center justify-between bg-surface border-b">
      <view class="flex items-center gap-2">
        <view class="w-2 h-2 rounded-full bg-accent animate-pulse"></view>
        <text class="font-bold">历史榜单</text>
      </view>
      <text class="text-xs text-secondary">{{ totalCount }}期</text>
    </view>

    <!-- 分组列表 -->
    <scroll-view
      scroll-y
      class="history-page__list"
      @scrolltolower="loadMore"
    >
      <view v-for="month in groupedHistory" :key="month.key" class="px-4 py-3">
        <text class="text-xs font-bold text-secondary mb-2 block">{{ month.label }}</text>
        
        <view 
          v-for="day in month.days" 
          :key="day.date" 
          class="bg-surface rounded-2xl p-4 mb-3 shadow-card"
          @click="goToDayDetail(day.date)"
        >
          <view class="flex items-center justify-between mb-2">
            <text class="text-sm font-semibold">{{ formatDate(day.date) }}</text>
            <text class="text-xs text-secondary">3期</text>
          </view>
          <view class="space-y-1">
            <view 
              v-for="item in day.cases" 
              :key="item.id" 
              class="text-sm text-secondary line-clamp-2"
            >
              • {{ item.title }}
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="py-4 text-center">
        <wd-button 
          v-if="hasMore && !loading" 
          @click="loadMore"
          custom-class="!rounded-full"
        >
          加载更多
        </wd-button>
        <wd-loading v-if="loading" type="circular" />
        <text v-if="!hasMore" class="text-xs text-muted">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { formatDate } from '@/utils/format'

interface CaseItem {
  id: string
  title: string
}

interface DayGroup {
  date: string
  count: number
  cases: CaseItem[]
}

interface MonthGroup {
  key: string
  label: string
  days: DayGroup[]
}

const historyData = ref<DayGroup[]>([])
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)

const totalCount = computed(() => historyData.value.length)

const groupedHistory = computed<MonthGroup[]>(() => {
  const groups: Record<string, MonthGroup> = {}
  
  historyData.value.forEach(day => {
    const date = new Date(day.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        key: monthKey,
        label: monthLabel,
        days: []
      }
    }
    
    groups[monthKey].days.push(day)
  })
  
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
})

/**
 * 获取历史榜单
 */
const fetchHistory = async (page: number = 1) => {
  if (loading.value) return
  
  loading.value = true
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'getDailyPick',
      data: { 
        action: 'history',
        page,
        pageSize: 10
      }
    })

    if (res.result.errCode === 0) {
      const data = res.result.data.list || []
      
      if (page === 1) {
        historyData.value = data
      } else {
        historyData.value.push(...data)
      }

      hasMore.value = data.length === 10
      currentPage.value = page
    }
  } catch (e) {
    console.error('[History] Fetch failed:', e)
  } finally {
    loading.value = false
  }
}

/**
 * 加载更多
 */
const loadMore = () => {
  fetchHistory(currentPage.value + 1)
}

/**
 * 刷新
 */
const onRefresh = async () => {
  currentPage.value = 1
  await fetchHistory(1)
  uni.stopPullDownRefresh()
}

/**
 * 跳转到指定日期的详情
 */
const goToDayDetail = (date: string) => {
  uni.navigateTo({
    url: `/pages/history/detail/index?date=${date}`
  })
}

onMounted(() => {
  fetchHistory(1)
})

defineExpose({
  onRefresh
})
</script>

<style scoped>
.space-y-1 > view + view {
  margin-top: 4px;
}
</style>
```

- [ ] **Step 3: 提交历史榜单页**

```bash
git add src/pages/history/
git commit -m "feat: implement history rankings page"
```

---

### Task 3.2: 重写个人中心页

**Files:**
- Modify: `src/pages/profile/index.vue`
- Modify: `src/pages/profile/index.json`

- [ ] **Step 1: 更新个人中心页配置**

更新 `src/pages/profile/index.json`：

```json
{
  "navigationBarTitleText": "我的",
  "navigationBarBackgroundColor": "#1A1A2E",
  "navigationBarTextStyle": "white",
  "backgroundColor": "#FAFAF8"
}
```

- [ ] **Step 2: 重写个人中心页组件**

完全替换 `src/pages/profile/index.vue`：

```vue
<template>
  <view class="profile-page bg-gray-50 min-h-screen pb-20">
    <!-- 顶部登录区 -->
    <view 
      class="profile-page__header p-8 pt-12 pb-16 flex items-center space-x-4 relative overflow-hidden"
      @click="handleLogin"
    >
      <!-- 装饰圆圈 -->
      <view class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none"></view>
      <view class="absolute left-10 bottom-0 w-20 h-20 rounded-full bg-white/5 pointer-events-none"></view>

      <view class="relative z-10 border-2 border-solid border-white/30 rounded-full p-1">
        <image 
          :src="userInfo?.avatar || '/static/images/avatar.svg'" 
          class="w-16 h-16 rounded-full bg-white/20"
        />
      </view>

      <view class="relative z-10 text-white flex-1">
        <template v-if="isLoggedIn">
          <text class="text-xl font-bold block">{{ userInfo?.name || '用户' }}</text>
          <text class="text-xs text-white/70">ID: {{ userInfo?.id?.substring(0, 8) || '' }}</text>
        </template>
        <template v-else>
          <text class="text-xl font-bold block">点击登录</text>
          <text class="text-xs text-white/70">登录同步收藏数据</text>
        </template>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="px-4 -mt-8 relative z-20">
      <view class="bg-white rounded-2xl shadow-lg p-5 flex justify-around items-center">
        <view class="text-center">
          <text class="text-xl font-bold text-primary block">{{ viewedCount }}</text>
          <text class="text-xs text-gray-400">已阅榜单</text>
        </view>

        <view class="w-px h-10 bg-gray-100"></view>

        <view class="text-center" @click="goToFavorites">
          <text class="text-xl font-bold text-primary block">{{ favoritesCount }}</text>
          <text class="text-xs text-gray-400">我的收藏</text>
        </view>
      </view>
    </view>

    <!-- 菜单列表（使用自定义 .profile-menu-item，完全按设计稿 8 项） -->
    <view class="profile-menu-list mx-4 mt-4 bg-surface rounded-2xl shadow-card overflow-hidden">
      <view class="profile-menu-item" @click="goToSubscription">
        <text class="profile-menu-icon">⬡</text>
        <text class="profile-menu-label">订阅管理</text>
        <text class="profile-menu-arrow">›</text>
      </view>
      <view class="profile-menu-item" @click="goToFavorites">
        <text class="profile-menu-icon">★</text>
        <text class="profile-menu-label">我的收藏</text>
        <text class="profile-menu-arrow">›</text>
      </view>
      <button class="share-btn profile-menu-item" open-type="share">
        <text class="profile-menu-icon">↗</text>
        <text class="profile-menu-label">转发给朋友</text>
        <text class="profile-menu-arrow">›</text>
      </button>
      <button class="contact-btn profile-menu-item" open-type="contact">
        <text class="profile-menu-icon">🎧</text>
        <text class="profile-menu-label">联系客服</text>
        <text class="profile-menu-arrow">›</text>
      </button>
      <view class="profile-menu-item" @click="goToAgreement">
        <text class="profile-menu-icon">📄</text>
        <text class="profile-menu-label">用户协议</text>
        <text class="profile-menu-arrow">›</text>
      </view>
      <view class="profile-menu-item" @click="goToPrivacy">
        <text class="profile-menu-icon">🔒</text>
        <text class="profile-menu-label">隐私政策</text>
        <text class="profile-menu-arrow">›</text>
      </view>
      <view class="profile-menu-item" @click="handleClearCache">
        <text class="profile-menu-icon">🗑</text>
        <text class="profile-menu-label">清除缓存</text>
        <text class="profile-menu-arrow">›</text>
      </view>
      <view class="profile-menu-item" @click="goToAbout">
        <text class="profile-menu-icon">ℹ</text>
        <text class="profile-menu-label">关于精益副业</text>
        <text class="profile-menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录按钮（已登录时显示，在菜单下方） -->
    <view v-if="isLoggedIn" class="mx-4 mt-6">
      <wd-button
        block
        type="error"
        plain
        custom-class="!rounded-xl !border-gray-200 !text-gray-500 !bg-white"
        @click="handleLogout"
      >
        退出登录
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store'

const userStore = useUserStore()
const { userInfo, isLoggedIn, favoritesCount, viewedCount } = storeToRefs(userStore)

const handleLogin = async () => {
  if (isLoggedIn.value) return
  
  uni.showLoading({ title: '登录中...', mask: true })
  
  try {
    await userStore.login()
  } catch (e) {
    console.error('[Profile] Login failed:', e)
  } finally {
    uni.hideLoading()
  }
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({
          title: '已退出',
          icon: 'none'
        })
      }
    }
  })
}

const goToFavorites = () => {
  uni.navigateTo({
    url: '/pages/profile/favorites/index'
  })
}

const goToSubscription = () => {
  uni.showToast({
    title: '订阅管理功能开发中',
    icon: 'none'
  })
}

const goToAgreement = () => {
  uni.showToast({
    title: '用户协议功能开发中',
    icon: 'none'
  })
}

const goToPrivacy = () => {
  uni.showToast({
    title: '隐私政策功能开发中',
    icon: 'none'
  })
}

const handleClearCache = () => {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除所有缓存吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.showToast({
          title: '缓存已清除',
          icon: 'success'
        })
      }
    }
  })
}

const goToAbout = () => {
  uni.showToast({
    title: '关于页面开发中',
    icon: 'none'
  })
}
</script>

<style scoped>
/* 自定义菜单项（按设计稿 .profile-menu-item） */
.profile-menu-list {
  overflow: hidden;
}

.profile-menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  cursor: pointer;
  transition: background var(--transition-base);
  border-bottom: 1px solid var(--color-border);
  min-height: 56px;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  text-align: left;
  width: 100%;
  font-family: inherit;
  font-size: inherit;
}

.profile-menu-item:last-child {
  border-bottom: none;
}

.profile-menu-item:active {
  background: var(--color-border);
}

.profile-menu-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.profile-menu-label {
  flex: 1;
  font-size: 15px;
  color: var(--color-primary);
}

.profile-menu-arrow {
  font-size: 18px;
  color: var(--color-muted);
  font-weight: 300;
}

.share-btn, .contact-btn {
  background: transparent;
  border: none;
  padding: 0;
}

.share-btn::after, .contact-btn::after {
  border: none;
}

</style>
```

- [ ] **Step 3: 提交个人中心页**

```bash
git add src/pages/profile/
git commit -m "feat: rewrite profile page with new design"
```

---

### Task 3.3: 创建收藏列表页

**Files:**
- Create: `src/pages/profile/favorites/index.vue`
- Create: `src/pages/profile/favorites/index.json`

- [ ] **Step 1: 创建收藏页配置**

创建文件 `src/pages/profile/favorites/index.json`：

```json
{
  "navigationBarTitleText": "我的收藏",
  "navigationBarBackgroundColor": "#FAFAF8",
  "navigationBarTextStyle": "black",
  "backgroundColor": "#FAFAF8",
  "enablePullDownRefresh": true
}
```

- [ ] **Step 2: 创建收藏页组件**

创建文件 `src/pages/profile/favorites/index.vue`：

```vue
<template>
  <view class="favorites-page bg-bg min-h-screen">
    <!-- 空状态 -->
    <view v-if="collections.length === 0 && !loading" class="flex flex-col items-center justify-center min-h-screen px-4">
      <text class="text-6xl mb-4">⭐</text>
      <text class="text-muted">还没有收藏任何案例</text>
      <wd-button type="primary" plain class="mt-4" @click="goToHome">
        去首页看看
      </wd-button>
    </view>

    <!-- 收藏列表 -->
    <scroll-view 
      v-else
      scroll-y 
      class="favorites-page__list px-4 py-3"
      @scrolltolower="loadMore"
    >
      <view 
        v-for="caseId in collections" 
        :key="caseId"
        class="bg-surface rounded-2xl p-4 mb-3 shadow-card"
        @click="goToDetail(caseId)"
      >
        <view class="flex items-center gap-3">
          <view class="text-yellow-500 text-lg">★</view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-semibold line-clamp-2">{{ getCaseTitle(caseId) }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view class="py-4 text-center">
        <wd-loading v-if="loading" type="circular" />
        <wd-button 
          v-else-if="hasMore" 
          @click="loadMore"
          custom-class="!rounded-full"
        >
          加载更多
        </wd-button>
        <text v-else class="text-xs text-muted">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useCollectionStore } from '@/store'

const collectionStore = useCollectionStore()
const { collections, isLoading, hasMore } = storeToRefs(collectionStore)

const loading = ref(false)

const caseTitles: Record<string, string> = {}

/**
 * 加载收藏列表
 */
const loadCollections = async () => {
  await collectionStore.refresh()
  // 加载案例标题
  for (const caseId of collections.value) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCaseDetail',
        data: { caseId }
      })
      if (res.result.errCode === 0) {
        caseTitles[caseId] = res.result.data.title
      }
    } catch (e) {
      console.error('[Favorites] Load title failed:', e)
    }
  }
}

/**
 * 获取案例标题
 */
const getCaseTitle = (caseId: string): string => {
  return caseTitles[caseId] || '加载中...'
}

/**
 * 加载更多
 */
const loadMore = async () => {
  loading.value = true
  await collectionStore.loadMore()
  loading.value = false
}

/**
 * 刷新
 */
const onRefresh = async () => {
  await loadCollections()
  uni.stopPullDownRefresh()
}

/**
 * 跳转到详情
 */
const goToDetail = (caseId: string) => {
  uni.navigateTo({
    url: `/pages/case-detail/index?id=${caseId}`
  })
}

/**
 * 返回首页
 */
const goToHome = () => {
  uni.switchTab({
    url: '/pages/index/index'
  })
}

onMounted(() => {
  loadCollections()
})

defineExpose({
  onRefresh
})
</script>
```

- [ ] **Step 3: 提交收藏页**

```bash
git add src/pages/profile/favorites/
git commit -m "feat: implement favorites list page"
```

---

## Phase 4: 订阅和客服功能

### Task 4.1: 实现订阅横幅（已在首页完成）

订阅功能已在首页 Task 1.7 中实现，无需额外工作。

### Task 4.2: 客服按钮（已在个人中心完成）

客服功能已在个人中心 Task 3.2 中实现（使用 `open-type="contact"`），无需额外工作。

---

## Phase 5: 优化和测试

### Task 5.1: 性能优化

**Files:**
- Modify: `src/main.ts`
- Create: `src/App.vue`

- [ ] **Step 1: 优化 App.vue**

确保 `src/App.vue` 包含正确的全局配置：

```vue
<template>
  <view />
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('[App] Launch')
  // 清除过期缓存
  try {
    const allKeys = uni.getStorageInfoSync().keys
    const now = Date.now()
    allKeys.forEach(k => {
      if (k.startsWith('leanstartup_cache_')) {
        const raw = uni.getStorageSync(k)
        try {
          const { expiry } = JSON.parse(raw)
          if (now > expiry) {
            uni.removeStorageSync(k)
          }
        } catch (e) {
          uni.removeStorageSync(k)
        }
      }
    })
  } catch (e) {
    console.error('[App] Cache cleanup failed:', e)
  }
})

onShow(() => {
  console.log('[App] Show')
})

onHide(() => {
  console.log('[App] Hide')
})
</script>

<style>
/* 全局样式优化 */
page {
  background-color: #FAFAF8;
}
</style>
```

- [ ] **Step 2: 提交优化**

```bash
git add src/App.vue
git commit -m "perf: add cache cleanup on app launch"
```

---

### Task 5.2: 测试

- [ ] **Step 1: 本地开发测试**

运行开发服务器：

```bash
npm run dev:mp-weixin
```

使用微信开发者工具打开项目，测试以下功能：

1. 首页加载今日精选
2. 点击案例跳转详情
3. 详情页收藏功能
4. 个人中心登录
5. 收藏列表查看
6. 下拉刷新

Run: 手动测试以上功能点，确保无报错

Expected: 所有功能正常工作

- [ ] **Step 2: 构建测试**

构建生产版本：

```bash
npm run build:mp-weixin
```

检查构建产物是否正常。

Run: `ls -la dist/build/mp-weixin/`

Expected: 构建产物存在

---

## 完成检查清单

在实施完成后，验证以下所有项目：

### 功能完整性
- [ ] 首页正常显示今日精选Top3
- [ ] 案例详情页正确展示评分和信息
- [ ] 收藏功能正常工作（含登录触发）
- [ ] 分享功能可用（onShareAppMessage）
- [ ] 历史榜单页正确分组展示
- [ ] 个人中心登录/退出正常
- [ ] 收藏列表正确显示
- [ ] 订阅横幅点击可触发订阅
- [ ] 客服按钮可打开微信客服

### 设计一致性
- [ ] 字体使用 Noto Serif SC（标题）+ Noto Sans SC（正文）
- [ ] 颜色符合 DESIGN.md 规范
- [ ] 间距使用 4px 基础单位
- [ ] 圆角统一为 4/8/12/9999px
- [ ] 阴影使用设计系统定义的值

### 技术规范
- [ ] TypeScript 无类型错误
- [ ] 所有组件使用 `<script setup>` 语法
- [ ] Pinia stores 正确工作
- [ ] 云函数调用成功
- [ ] 缓存机制正常（1小时TTL）
- [ ] 下拉刷新功能可用

### 性能
- [ ] 首屏加载时间 < 2秒
- [ ] 下拉刷新响应及时
- [ ] 滚动流畅无卡顿

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | success | scope decisions captured |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open | 6 issues found, 4 resolved |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**CODEX:** Outside voice found 5 CRASH-level API contract mismatches (confirmed by code review)

**CROSS-MODEL:** Review said API params OK; Outside Voice found case_id vs caseId, 'toggle' vs 'collect/uncollect', missing getUserInfo action, wrong response path. **User chose: Fix frontend to match backend.**

**UNRESOLVED:** 2
- TabBar icons need actual download (placeholder in plan only)
- TailwindCSS not installed (plan uses Tailwind-like class names but no Tailwind installed)

**VERDICT:** CEO + ENG CLEARED — 4 critical decisions made, 2 items deferred to implementation

---

## Review Findings Detail

### Resolved Issues (4)
1. **UI Library Conflict** → Replace @dcloudio/uni-ui with wot-design-uni
2. **Profile Path** → Rewrite existing profile.vue instead of creating index.vue
3. **favorites ref import** → Add `ref` to vue import in favorites/index.vue
4. **Cloud Function API Mismatch** → Fix frontend to use case_id, collect/uncollect, remove getUserInfo, fix response path

### Open Issues (2)
1. **TabBar Icons** → Plan only has placeholder, needs actual download via downloadRemoteFile
2. **TailwindCSS** → Plan uses Tailwind-like classes (.flex, .space-y-3, .rounded-2xl) but Tailwind not installed; need to either install Tailwind or convert to custom CSS

### Test Coverage
- Frontend: 0% coverage (0/18 paths tested)
- Recommended: Add unit tests for useCache.ts, user.ts, collection.ts

---

**计划状态**: ✅ 审核完成，准备实施

**下一步**: 调用 /ship 部署（需要先修复 TabBar 图标和 TailwindCSS 问题）

