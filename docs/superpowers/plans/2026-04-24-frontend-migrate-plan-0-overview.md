# 前端迁移实施总计划 (LeanSkill → LeanStartup)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 LeanSkill 项目的前端代码搬运到 LeanStartup，适配案例库数据模型，实现设计稿中 10 个页面的完整 UI。

**Architecture:** 从 LeanSkill (D:\MyWork\LeanMind\LeanSkill\src\) 复制页面/组件/工具到 LeanStartup (D:\MyWork\LeanMind\LeanStartup\src\)，将 skill→case 术语替换，适配 LeanStartup 已有的 API 层和 Store。保留 LeanStartup 的配色方案 (#1A1A2E/#E94560/#F5A623) 和设计 token。

**Tech Stack:** UniApp 3.0 + Vue 3 + TypeScript + Pinia + CloudBase SDK

---

## 分计划索引

| # | 文件 | 内容 | 任务数 |
|---|------|------|--------|
| 0 | `2026-04-24-frontend-migrate-plan-0-overview.md` | 母计划：策略、映射表、执行顺序 | - |
| 1 | `2026-04-24-frontend-migrate-plan-1-infra.md` | 基础设施：config, store, utils, composables | 6 |
| 2 | `2026-04-24-frontend-migrate-plan-2-home.md` | 首页 + 核心组件：case-card, index, subscribe-banner | 5 |
| 3 | `2026-04-24-frontend-migrate-plan-3-history.md` | 历史榜单页：history list, history detail | 3 |
| 4 | `2026-04-24-frontend-migrate-plan-4-profile.md` | 个人中心 + 子页面：profile, favorites, subscription, about 等 | 6 |

**总计约 20 个任务。**

---

## 执行策略

### 为什么搬运而不是从零实现？

1. LeanSkill 的 UI 已经过设计评审和用户验证，CSS/布局/交互都打磨过
2. 两个项目的页面结构几乎一致（首页→详情→历史→个人中心）
3. 数据模型同构（skill ↔ case），只是字段名不同
4. 从零复刻设计稿效果不好，直接搬运成熟代码更快更准确

### 核心原则

1. **Copy then Adapt** — 先复制文件，再改内容和引用
2. **保留 LeanStartup 的 API 层** — 已有的 `api/modules/` 不动，新页面调用现有 API
3. **保留 LeanStartup 的配色** — 用 `#1A1A2E/#E94560/#F5A623` 而非 LeanSkill 的 `#0F172A/#F97316`
4. **保留 LeanStartup 的设计 token** — `styles/design-tokens.scss` 不动

---

## 数据模型映射表 (LeanSkill → LeanStartup)

| LeanSkill 字段 | LeanStartup 字段 | 说明 |
|----------------|-----------------|------|
| `Skill` 接口 | `DailyCase` / `CaseDetail` | 主数据模型 |
| `skill._id` | `case.id` | 唯一标识 |
| `skill.name` | `case.title` | 标题 |
| `skill.value` | `case.score_total` | 评分/价值 |
| `skill.description` | `case.summary` | 摘要描述 |
| `skill.tags` | `tags` (cost, source, time) | 标签数组 |
| `skill.installCommand` | _(删除)_ | 案例库无安装命令 |
| `skill.source` | `case.source_account` | 来源账号 |
| `skill.heat` | _(删除)_ | 案例库无热度 |
| `Ranking` 接口 | `HistoryItem` / `DailyPickResponse` | 榜单数据 |
| `ranking.date` | `item.date` | 日期 |
| `ranking.skills` | `item.cases` | 案例 ID 列表 |

---

## API 映射表

| LeanSkill API | LeanStartup API | 文件 |
|--------------|----------------|------|
| `getTodayRanking()` | `getDailyPick()` | `api/modules/daily.ts` |
| `getSkillDetail(id)` | `getCaseDetail(id)` | `api/modules/case.ts` |
| `getHistoryList({page, pageSize})` | `getHistoryPicks({page, pageSize})` | `api/modules/daily.ts` |
| `login(data?)` | _(保留 silentLogin)_ | `composables/useLogin.ts` |
| `getFavorites()` | `getUserCollections()` | `api/modules/collection.ts` |
| `toggleFavorite(params)` | `toggleCollection(params)` | `api/modules/collection.ts` |
| `subscribeDaily()` | `subscribe()` | `api/modules/subscription.ts` |
| `getSubscriptionStatus()` | `getSubscriptionStatus()` | `api/modules/subscription.ts` |

---

## Store 映射表

| LeanSkill Store | LeanStartup Store | 操作 |
|----------------|-------------------|------|
| `useSkillStore` | 新建 `useCaseStore` | 复制并改名 skill→case |
| `useUserStore` | `useUserStore` (已有) | 保留不动（已有 setUser/incrementViewed/setFavoritesCount/logout） |
| `useSubscriptionStore` | 新建 `useSubscriptionStore` | 复制并适配 |
| _(无)_ | `useCollectionStore` (已有) | 保留 |

---

## 配色映射表

| 元素 | LeanSkill | LeanStartup | 说明 |
|------|-----------|-------------|------|
| 主色 | `#0F172A` | `#1A1A2E` | 深墨色 |
| 强调色 | `#F97316` (橙) | `#E94560` (玫红) | 关键按钮、徽标 |
| 金色 | _(无)_ | `#F5A623` | 评分 |
| 边框 | `#E2E8F0` | `#E8E6E1` | 暖灰边框 |
| 背景 | `#F8F8F8` | `#FAFAF8` | 暖白底 |

**规则：** 搬运代码时，凡是出现 `#0F172A` 替换为 `#1A1A2E`，`#F97316` 替换为 `#E94560`，`#E2E8F0` 替换为 `#E8E6E1`。

---

## 文件清理清单

以下 LeanStartup 文件在迁移过程中将被**替换**（先备份后覆盖）：

| 类别 | 文件 | 操作 |
|------|------|------|
| 页面 | `pages/index/index.vue` | 替换 |
| 页面 | `pages/history/index.vue` | 替换（当前是占位符） |
| 页面 | `pages/profile/index.vue` | 替换（当前是占位符） |
| 页面 | `pages/profile/favorites/index.vue` | 替换（当前是占位符） |
| 页面 | `pages/profile/subscription/index.vue` | 替换（当前是占位符） |
| 页面 | `pages/profile/about/index.vue` | 替换（当前是占位符） |
| 页面 | `pages/profile/agreement/index.vue` | 替换（当前是占位符） |
| 页面 | `pages/profile/privacy/index.vue` | 替换（当前是占位符） |
| 组件 | `components/CaseCard.vue` | 删除，用 `components/case-card/` 替代 |
| 组件 | `components/SubscribeBanner.vue` | 删除，用 `components/subscribe-banner/` 替代 |
| 组件 | `components/LoadingSpinner.vue` | 删除，用 skeleton-card 替代 |
| 组件 | `components/EmptyTip.vue` | 删除，用空状态内联实现 |

---

## 新增文件清单

| 类别 | 文件 | 来源 |
|------|------|------|
| Store | `store/case.ts` | 从 `LeanSkill/store/skill.ts` 适配 |
| Store | `store/subscription.ts` | 从 `LeanSkill/store/subscription.ts` 适配 |
| 组件 | `components/case-card/index.vue` | 从 `LeanSkill/components/skill-card/index.vue` 适配 |
| 组件 | `components/skeleton-card/index.vue` | 从 LeanSkill 复制 |
| 组件 | `components/subscribe-banner/index.vue` | 从 LeanSkill 复制并适配 |
| 服务 | `services/CacheService.ts` | 从 LeanSkill 复制 |
| Composable | `composables/useTagColors.ts` | 从 LeanSkill 复制 |
| 配置 | `config/app.config.ts` | 从 LeanSkill 复制并适配 |

---

## 验证标准

每个计划完成后必须通过：

1. `npm run build:mp-weixin` 构建成功
2. 微信开发者工具中无编译错误
3. 页面能正常渲染，交互正常
