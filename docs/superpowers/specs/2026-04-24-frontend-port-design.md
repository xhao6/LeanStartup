# LeanStartup 前端移植设计方案

> **日期:** 2026-04-24
> **状态:** 已确认
> **基于:** brainstorming 头脑风暴会议

---

## 1. 背景

LeanStartup（精益副业案例库）已有后端（CloudBase 云函数 + NoSQL），前端空白。
需要基于：
- **技术栈来源:** LeanSkill（UniApp Vue 3 + wot-design-uni + UnoCSS + Pinia + CloudBase SDK）
- **设计稿:** `docs/design/preview.html`（5 个核心页面）
- **PRD:** `docs/PRD/PRD-精益副业案例库-MVP-v1.md`
- **既有计划:** `docs/superpowers/plans/2026-04-23-frontend-implementation-plan.md`

目标：**重写前端 UI**，匹配设计稿，不迁移 LeanSkill 业务逻辑。

---

## 2. 技术栈选择

| 层级 | 选型 | 来源 |
|------|------|------|
| 框架 | UniApp 3.0 + Vue 3 | LeanSkill |
| UI 库 | wot-design-uni | LeanSkill |
| 样式 | UnoCSS utility classes + SCSS design tokens | LeanSkill |
| 状态管理 | Pinia | LeanSkill |
| 云 SDK | @cloudbase/js-sdk | LeanSkill |
| 构建 | Vite | LeanSkill |

**样式系统说明:** "UnoCSS utility classes + SCSS design tokens" 与 LeanSkill 的 "UnoCSS + SCSS" 完全一致，指同一模式。

---

## 3. 移植策略

**方案 B：技术栈迁移**

从 LeanSkill 复制基础设施，页面按 preview.html 重新实现。

### 3.1 从 LeanSkill 复制的文件

```
src/
├── styles/                    # design-tokens.scss, global.scss
├── api/core/                  # cloud.ts, tcbWeb.ts
├── api/modules/               # daily.ts, case.ts, collection.ts, analytics.ts
├── composables/               # useCache.ts, useShare.ts, useLogin.ts
├── store/                     # user.ts, collection.ts, index.ts
├── utils/                     # constants.ts, format.ts
└── components/               # CaseCard.vue, ScoreBadge.vue, TagMor.vue
```

### 3.2 按 preview.html 重新实现的页面（共 10 个）

```
src/
├── pages/index/index.vue                    # 首页（今日精选 Top3）
├── pages/case-detail/index.vue             # 案例详情页
├── pages/history/index.vue                 # 历史榜单页
├── pages/history/detail/index.vue          # 往期榜单详情
├── pages/profile/index.vue                 # 个人中心
├── pages/profile/favorites/index.vue       # 收藏列表
├── pages/profile/privacy/index.vue         # 隐私政策
├── pages/profile/agreement/index.vue      # 用户协议
├── pages/profile/about/index.vue           # 关于
└── pages/profile/subscription/index.vue   # 订阅管理
```

---

## 4. 设计系统（从 preview.html 提取）

### 4.1 颜色系统

```scss
:root {
  --color-primary: #1A1A2E;     // 深墨色
  --color-secondary: #4A4A68;   // 灰紫
  --color-accent: #E94560;     // 玫红
  --color-gold: #F5A623;        // 金色评分
  --color-bg: #FAFAF8;          // 暖白背景
  --color-surface: #FFFFFF;     // 卡片白
  --color-border: #E8E6E1;      // 边框
  --color-muted: #9B9A97;       // 辅助灰
}
```

### 4.2 字体系统

| 用途 | 字体 | 说明 |
|------|------|------|
| Display/标题 | Noto Serif SC | 衬线体，期刊感 |
| Body/正文 | Noto Sans SC | 无衬线，易读 |
| 数字/评分 | Roboto Mono | 等宽，对齐 |

### 4.3 莫兰迪标签色（5 色调色板）

| 编号 | 背景 | 文字 |
|------|------|------|
| mor-1 | #E8D5C4 | #5D4E37 |
| mor-2 | #D4E2D4 | #3D5C3D |
| mor-3 | #D5D4E2 | #4A4D6E |
| mor-4 | #E2D4D5 | #6E4A4D |
| mor-5 | #DFDBD0 | #5C5A4F |

### 4.4 排名徽章渐变

| 排名 | 渐变 |
|------|------|
| 1 | linear-gradient(#FBBF24, #F97316) |
| 2 | linear-gradient(#94A3B8, #64748B) |
| 3 | linear-gradient(#D4A574, #B8956C) |

---

## 5. 页面规格

### 5.1 首页（pages/index/index.vue）

**结构:**
- Hero 大标题：「搞钱案例榜」+ slogan
- 顶部导航栏（今日精选 + 日期）
- Top 3 案例卡片列表（排名徽章左置）
- 订阅横幅（shimmer 动画）
- TabBar

**卡片布局:**
- 左侧：排名徽章（渐变背景 + 白色数字）
- 右侧：标题 + 评分标签（★分数）+ 成本标签 + 摘要

### 5.2 案例详情页（pages/case-detail/index.vue）

**结构:**
- 顶部导航（返回 + 标题 + 分享）
- 评分总览区（大号分数 + 五维度进度条）
- 来源信息行
- 莫兰迪标签列表
- 核心摘要
- 案例故事（浅蓝引用框）
- 基础信息网格（启动成本/预期收益/变现周期/适合人群）
- 实践步骤 Checklist（可勾选 + 进度显示）
- 工具/资源网格（2列）
- 避坑指南（橙色警告框）
- 风险标签（红色 pill）
- 固定底部操作栏（存图/分享/收藏）

### 5.3 历史榜单页（pages/history/index.vue）

**结构:**
- 顶部导航（历史 + 计数）
- 按月分组列表
- 每组：月份标题 + 日期卡片列表
- 日期卡片：日期 + Top3 案例标题 + 箭头
- 加载更多按钮

### 5.4 往期榜单详情（pages/history/detail/index.vue）

**结构:**
- 顶部导航（返回 + 标题）
- 日期横幅（圆点动画 + 日期 + 星期）
- 当日 Top3 卡片列表（与首页卡片一致）
- 底部提示

### 5.5 个人中心（pages/profile/index.vue）

**结构:**
- 深色头部（渐变背景）：头像 + 登录提示
- 统计卡片（两栏：已阅榜单 + 我的收藏）
- 菜单列表（8项，按设计稿顺序）
- TabBar

### 5.6 收藏列表（pages/profile/favorites/index.vue）

**结构:**
- 空状态（无收藏时）
- 收藏卡片列表（标题 + 评分 + 进度）
- 加载更多

### 5.7 隐私政策页（pages/profile/privacy/index.vue）

**结构:**
- 顶部导航（返回 + 标题）
- 隐私政策正文（静态 HTML/Markdown 渲染）
- 固定底部同意按钮

### 5.8 用户协议页（pages/profile/agreement/index.vue）

**结构:**
- 顶部导航（返回 + 标题）
- 用户协议正文（静态 HTML/Markdown 渲染）
- 固定底部同意按钮

### 5.9 关于页（pages/profile/about/index.vue）

**结构:**
- 顶部导航（返回 + 标题）
- App Logo + 版本号
- 产品介绍
- 联系方式/客服入口
- 备案信息（可选）

### 5.10 订阅管理页（pages/profile/subscription/index.vue）

**结构:**
- 顶部导航（返回 + 标题）
- 订阅状态说明
- 订阅/退订按钮
- 订阅历史记录（可选）

---

## 6. API 层映射

云函数名称 LeanSkill 与 LeanStartup 完全一致，可直接复用：

| 云函数 | 功能 |
|--------|------|
| `getDailyPick` | 获取今日精选 |
| `getCaseDetail` | 获取案例详情 |
| `getUserCollections` | 获取收藏列表 |
| `toggleCollection` | 切换收藏状态 |
| `trackEvent` | 埋点上报 |

---

## 7. 数据模型（与 PRD 一致）

### 7.1 Case（案例）

```typescript
interface Case {
  id: string;              // 自增编号 100001+
  title: string;          // 标题 <=50字
  summary: string;        // 核心摘要 <=200字
  source_account: string; // 来源公众号
  source_url: string;     // 原文链接
  score_total: number;    // 总分 0-10
  score_feasibility: number;  // 落地可行性 0-3
  score_profit: number;        // 收益潜力 0-2
  score_timeliness: number;    // 时效性 0-2
  score_detail: number;        // 实操细节 0-2
  score_fitness: number;       // 用户适配度 0-1
  cost: string;            // 启动成本
  expected_revenue: string;// 预期收益
  cycle: string;           // 变现周期
  suitable_for: string;   // 适合人群
  steps?: Step[];         // 操作步骤
  tools?: Tool[];         // 工具/资源
  pitfalls?: string;      // 避坑指南
  risk_tags?: string[];   // 风险标签
  story?: string;         // 案例故事
  status: string;         // pending/reviewed/published/archived
}

interface Step { step: string; order: number; }
interface Tool { name: string; desc: string; }
```

### 7.2 DailyPick（每日精选）

```typescript
interface DailyPick {
  date: string;           // YYYY-MM-DD
  case_ids: string[];      // 3 个案例 ID
}
```

### 7.3 UserCollection（用户收藏）

```typescript
interface UserCollection {
  openid: string;
  case_id: string;
  progress: Record<string, boolean>;  // {"step_1": true, ...}
  created_at: string;
  updated_at: string;
}
```

---

## 8. 导航结构

```
TabBar
├── 首页 (pages/index/index)
│   └── 点击案例卡片 → 案例详情 (navigateTo)
├── 榜单 (pages/history/index)
│   ├── 点击日期卡片 → 往期榜单详情 (navigateTo)
│   └── 点击案例卡片 → 案例详情 (navigateTo)
└── 我的 (pages/profile/index)
    ├── 我的收藏 → 收藏列表 (navigateTo)
    └── 点击收藏卡片 → 案例详情 (navigateTo)
```

---

## 9. 不在范围内

- Tailwind CSS（已从项目中移除）
- LeanSkill 业务逻辑（技能评分等）
- 定时任务前端配置
- 分享卡片 Canvas 生成（F6 MVP 阶段降级为原生分享）

---

## 10. 验收标准

### 核心页面（MVP 必须）
- [ ] 首页显示今日精选 Top3
- [ ] 案例详情页五维度评分可视化
- [ ] Checklist 可勾选并云端同步
- [ ] 收藏功能正常
- [ ] 历史榜单按月分组
- [ ] 个人中心 8 项菜单完整
- [ ] TabBar 导航正常

### 次要页面（MVP 完成后的增强）
- [ ] 收藏列表页
- [ ] 往期榜单详情页
- [ ] 隐私政策页
- [ ] 用户协议页
- [ ] 关于页
- [ ] 订阅管理页

### 设计一致性
- [ ] 设计与 preview.html 一致
- [ ] 颜色/字体/间距符合设计系统
