# Design System — 精益副业案例库

> **最后更新:** 2026-04-23
> **设计参考:** 完全对齐 LeanSkill（轻选Skills）设计语言

## Product Context
- **What this is:** 微信小程序，每日推送3个精选副业案例，通过AI评分筛选可操作性最强的高价值项目
- **Who it's for:** 寻找副业机会的职场人、大学生、想增加收入的创作者
- **Space/industry:** 副业指导 / 创业资讯 / 案例库
- **Project type:** 内容消费型小程序（阅读收藏+数据追踪）
- **Memorable thing:** "这是一个有人工精选的内容库，不是算法推荐的垃圾场"

## Aesthetic Direction
- **Direction:** Editorial Magazine（编辑杂志风）——精选感、可信度、易读性
- **Decoration level:** minimal（排版驱动，无装饰）
- **Mood:** 专业、可信、易读、适合分享
- **Reference sites:** LeanSkill（轻选Skills）——完全对齐设计语言

## Typography
- **Display / 标题:** Noto Serif SC — 中文衬线体，强化"精选策展"权威感，用于案例标题、页面大标题
- **Body / 正文:** Noto Sans SC — 现代无衬线，干净易读，用于正文、按钮、标签、描述
- **UI / Labels:** Noto Sans SC Medium — 正文加粗，用于标签、次级标题
- **Number / 评分:** Roboto Mono — 等宽数字，用于 AI 总分、维度评分、序号
- **Loading:** Google Fonts CDN
- **Scale:**
  - 案例标题: 22px / 600 serif
  - 页面标题: 24px / 700 serif
  - 正文: 15px / 400
  - 标签/来源: 12px / 500
  - 评分大字: 48px / 700 mono
  - 维度评分: 14px / 600 mono

## Color
- **Approach:** restrained（克制使用颜色，色彩有意义）
- **Primary:** #1A1A2E（深墨色）— 主要文字、标题
- **Secondary:** #4A4A68（灰紫色）— 次要文字、描述
- **Accent:** #E94560（玫红色）— 强调色、品牌色、active状态
- **Gold:** #F5A623（金色）— 评分、徽章、成就
- **Background:** #FAFAF8（暖白纸张色）— 页面背景
- **Surface:** #FFFFFF（纯白）— 卡片、容器
- **Border:** #E8E6E1（浅灰边框）— 分隔线、边框
- **Muted:** #9B9A97（中性灰）— 占位符、禁用状态

- **Semantic:**
  - Success: #059669（绿色）
  - Warning: #F59E0B（橙金）
  - Error: #DC2626（红色）
  - Info: #0369A1（蓝色）

- **Dark mode:**
  - 主背景: #1A1A2E（原surface色）
  - 表面: #252538
  - 文字反转: #FAFAF8 / #B8B8B8
  - 金色调整: #FFC857（更亮）
  - 玫红调整: #FF6B8A（更亮）

- **Tag Palette（成本标签）:**
  - 零成本: #D1FAE5 / #059669
  - 低门槛: #DBEAFE / #2563EB
  - 其他: #FAFAF8 / #4A4A68（默认）

- **莫兰迪色标签（5种）:**
  - case-tag-mor-1: #E8D5C4 / #5D4E37（暖棕）
  - case-tag-mor-2: #D4E2D4 / #3D5C3D（橄榄绿）
  - case-tag-mor-3: #D5D4E2 / #4A4D6E（灰蓝）
  - case-tag-mor-4: #E2D4D5 / #6E4A4D（灰粉）
  - case-tag-mor-5: #DFDBD0 / #5C5A4F（米灰）

## Spacing
- **Base unit:** 4px
- **Density:** comfortable（舒适阅读）
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(12px/16px) lg(20px/24px) xl(32px) 2xl(48px)

## Layout
- **Approach:** hybrid（App用grid，榜单用creative-editorial）
- **Grid:** 单栏布局（小程序标准390px宽度）
- **Max content width:** 390px（固定屏幕宽度）
- **Border radius scale:** sm(4px) md(8px) lg(12px) full(9999px)
- **Card spacing:** 10-12px垂直间距
- **Safe area:** 适配刘海屏、底部指示器

### 阴影系统
- --shadow-card: 0 2px 12px rgba(26,26,46,0.06)（基础卡片）
- --shadow-card-hover: 0 8px 32px rgba(26,26,46,0.12)（hover状态）
- --shadow-sm: 0 1px 4px rgba(0,0,0,0.04)
- --shadow-md: 0 2px 8px rgba(0,0,0,0.08)
- --shadow-lg: 0 4px 16px rgba(0,0,0,0.12)

## Motion
- **Approach:** minimal-functional（只保留辅助理解的动画）
- **Easing:** ease-out（进入）、ease-in（退出）、ease-in-out（移动）
- **Duration:**
  - micro: 50-100ms（hover反馈）
  - short: 150-250ms（状态切换）
  - medium: 250-400ms（页面转场）
- **Key animations:**
  - hover: translateY(-2px) + shadow增强
  - active: scale(0.98)
  - pulse: 点呼吸动画（状态指示）

## Share Card Design（核心功能）
- **独立设计语言:** 分享卡片有自己专属的设计，与页面不同，确保导出后高对比、抓眼球
- **深色背景:** linear-gradient(145deg, #1A1A2E, #252538, #1A1A2E)
- **布局:** 顶部品牌标签 → 案例标题 → 一句话摘要 → 底部评分+小程序码
- **顶部:** "精益副业案例库"标签（玫红背景）
- **中部:** 案例标题（白色大号衬线）+ 一句话摘要（半透明白）
- **底部:** AI评分金色大字 + "AI评分"标签 + 小程序码占位
- **比例:** 9:16（朋友圈移动端适配）

## Component Standards（组件标准）

### 按钮系统
- **主要按钮（btn-primary）**
  - 背景: linear-gradient(135deg, #E94560, #FF6B8A)
  - 圆角: 9999px（胶囊形）
  - 阴影: 0 2px 8px rgba(0,0,0,0.04)
  - hover: 阴影增强(0 4px 16px rgba(233,69,96,0.3)) + translateY(-1px)
  - active: scale(0.98)
  - 最小高度: 44px（触摸目标）

- **次要按钮（btn-secondary）**
  - 背景: #FFFFFF
  - 边框: 1.5px solid #E8E6E1
  - hover: 边框变为主题色 + 阴影增强
  - 其他同主按钮

- **幽灵按钮（btn-ghost）**
  - 背景: transparent
  - 边框: 1.5px solid #E94560
  - hover: 背景变为主题色，文字变白

### 卡片系统
- **基础卡片**
  - 背景: #FFFFFF
  - 边框: 1px solid #E8E6E1
  - 圆角: 12-16px
  - 阴影: 0 2px 12px rgba(26,26,46,0.06)
  - hover: 0 8px 32px rgba(26,26,46,0.12) + translateY(-2px)

- **悬浮卡片（profile-case-card）**
  - 与基础卡片一致
  - active: scale(0.99)

### 标签系统
- **通用标签**
  - 圆角: 9999px（胶囊形）
  - 内边距: 4px 10px
  - 字体: 11px font-weight: 600
  - 背景: #FAFAF8
  - 边框: 1px solid #E8E6E1

- **莫兰迪色标签（5种）**
  - case-tag-mor-1: #E8D5C4 / #5D4E37（暖棕）
  - case-tag-mor-2: #D4E2D4 / #3D5C3D（橄榄绿）
  - case-tag-mor-3: #D5D4E2 / #4A4D6E（灰蓝）
  - case-tag-mor-4: #E2D4D5 / #6E4A4D（灰粉）
  - case-tag-mor-5: #DFDBD0 / #5C5A4F（米灰）

### 评分徽章
- **渐变:** linear-gradient(135deg, #F5A623, #FF8C00)
- **圆角:** 20px
- **内边距:** 4px 10px
- **字体:** Roboto Mono font-weight: 700
- **颜色:** #FFF
- **图标:** ★（10px）

### 菜单列表（个人中心）
- **容器:** 白色卡片包裹，圆角12px
- **项间距:** 0（用边框分隔）
- **内边距:** 16px 18px
- **最小高度:** 56px
- **图标:** 20px，宽度固定24px居中
- **文字:** 15px font-weight: 400
- **分隔线:** 1px solid #E8E6E1（最后一项无）
- **hover:** 背景变#FAFAF8
- **active:** 背景变#E8E6E1

### TabBar
- **位置:** 固定底部
- **高度:** 自适应内容 + safe-area-inset-bottom
- **内边距:** 6px 0（顶部），适配安全区域（底部）
- **图标:** 20px
- **文字:** 11px font-weight: 500
- **颜色:** 默认#9B9A97，active时#E94560
- **间距:** 图标与文字4px
- **布局:** flex，均分4份
- **过渡:** color 150ms ease-out
- **active反馈:** 图标scale(0.9)

### 榜单排名徽章
- **Rank 1:** linear-gradient(180deg, #FBBF24, #F97316)（金）
- **Rank 2:** linear-gradient(180deg, #94A3B8, #64748B)（银）
- **Rank 3:** linear-gradient(180deg, #D4A574, #B8956C)（铜）
- **Rank 4+:** #FAFAF8背景，#4A4A68文字

## Page-Specific Guidelines（页面规范）

### 首页（今日精选Top3）
- **大标题区域:** 居中对齐，28px粗体
- **今日精选横幅:** 左侧呼吸点 + 文字 + 右侧日期
- **卡片列表:** 横向布局，左侧排名徽章，右侧内容
- **卡片hover:** 阴影增强 + 轻微上浮
- **订阅横幅:** 渐变背景，shimmer动画

### 案例详情页
- **导航栏:** 返回箭头 + 标题 + 分享图标
- **标题区:** Noto Serif SC，16px粗体，行高1.4
- **评分可视化:** 左侧大号总分，右侧进度条
- **基础信息:** 2x网格布局，图标+标签+值
- **实践步骤:** 圆形复选框，完成时绿色填充
- **工具/资源:** 2x网格，名称+描述
- **底部操作栏:** 固定底部，3个按钮平均分布

### 历史榜单页
- **顶部导航:** 左侧状态+呼吸点，中间标题，右侧统计
- **月份分组:** 分组标题 + 期数统计
- **历史卡片:** 日期 + 3条案例摘要（标题显示2行）
- **排名徽章:** 与首页一致的渐变色
- **加载更多:** 居中按钮，9999px圆角，14px加粗

### 个人中心页（完全按LeanSkill设计）
- **顶部登录区:** 深色渐变背景(#2D2D44 → #1A1A2E)，居中对齐
- **头像区域:** 64px圆形笑脸，白色半透明背景
- **登录提示:** "点击登录"(18px白色粗体) + "登录同步收藏数据"(13px半透明白)
- **统计卡片:** 2栏布局（0 已阅榜单 / 0 我的收藏），中间分隔线
- **功能菜单:** 8项标准列表（白色卡片包裹，分隔线）
  1. 订阅管理（⬡六边形图标）
  2. 我的收藏（★五角星图标）
  3. 转发给朋友（↗分享图标）
  4. 联系客服（🎧耳机图标）
  5. 用户协议（📄文档图标）
  6. 隐私政策（🔒锁形图标）
  7. 清除缓存（🗑垃圾桶图标）
  8. 关于精益副业（ℹ信息图标）

## Icon Guidelines
- **优先使用:** SVG图标（Heroicons、Lucide、Simple Icons）
- **禁用:** Emoji作为UI图标
- **尺寸:** 16-20px（根据context调整）
- **颜色:** 继承文字颜色或使用主题色

## Accessibility（无障碍）
- **触摸目标:** 最小44x44px
- **颜色对比:** 正文文字最少4.5:1对比度
- **焦点状态:** 所有可交互元素有可见焦点环
- **文字缩放:** 支持系统字号设置

## Anti-Patterns（避免）
- ❌ 紫色/紫色渐变作为默认强调色
- ❌ 3列功能网格配图标圆圈
- ❌ 所有内容居中对齐
- ❌ 统一圆角（所有元素相同border-radius）
- ❌ 渐变按钮作为主要CTA
- ❌ 系统字体（system-ui / -apple-system）作为主要字体
- ❌ Inter、Roboto、Arial作为默认字体选择

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-23 | 初始设计系统创建 | 基于 LeanSkill 设计语言，完全对齐UI/UX规范 |
| 2026-04-23 | 个人中心页重构 | 按照LeanSkill实际截图设计，8项功能菜单 + 深色顶部 |
| 2026-04-23 | TabBar样式统一 | 20px图标，11px文字，flex布局，active颜色 |
| 2026-04-23 | 按钮圆角统一 | 9999px胶囊形，柔和阴影，hover/active反馈 |
| 2026-04-23 | 莫兰迪色标签系统 | 5种低饱和度颜色，提升视觉高级感 |
| 2026-04-23 | 历史榜单分组展示 | 按月份分组，每个日期卡片展示3条案例摘要 |
| 2026-04-23 | 分享卡片独立设计 | 深色背景 + 高对比，确保朋友圈截图后抓眼球 |

---

**Implementation Priority:**
1. 字体加载（Noto Serif SC + Noto Sans SC + Roboto Mono）
2. 颜色变量定义
3. 基础组件样式（按钮、卡片、标签）
4. 4个核心页面布局
5. Dark mode适配
6. 微交互动画