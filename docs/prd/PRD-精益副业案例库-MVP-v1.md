# PRD: 精益副业案例库 MVP v1.0

| 字段 | 值 |
|------|-----|
| 产品名称 | 精益副业案例库 |
| 版本 | MVP v1.1 |
| 日期 | 2026-04-21 |
| 状态 | 待开发 |
| 负责人 | Ava Bytewood |
| 基于文档 | CEO Plan 2026-04-21, office-hours design doc, BEST-PRACTICES.md |

---

## 1. 产品概述

### 1.1 一句话描述

每日精选 3 个可落地副业案例的微信小程序，AI 评分筛选，看完就能做。

### 1.2 核心定位

解决用户"看了很多副业案例仍不会落地"的痛点。通过 AI 评分 + 人工审核，从公众号文章中精选出每日 3 个可操作性最强的副业案例，提供结构化的操作步骤、成本收益分析和避坑指南。

### 1.3 Slogan

每日 3 个公众号搞钱案例，精益筛选，落地无忧。

### 1.4 小程序审核信息

**审核介绍**: 精益副业案例库，每日精选 3 个公众号优质搞钱案例，智能打分筛选，提供今日精选及历史榜单，聚焦可落地、低成本副业，帮新手、职场人找副业方向、避坑。

**审核备案备注**: 本小程序为用户提供优质副业案例信息服务，整理并精选靠谱副业方向，展示案例亮点、适用人群、成本收益及风险提示。内容均来源于公开合规信息，旨在为有副业需求的用户提供参考，不涉及交易、培训及付费指导等经营行为。

### 1.5 目标用户

想搞副业但无方向、怕踩坑、没时间研究的普通用户。

细分画像：

| 画像 | 特征 | 核心诉求 |
|------|------|---------|
| 在校学生 | 时间多，本金少（<500元） | 零成本启动，短期见收益 |
| 职场人 | 时间少（每天1-2小时），有稳定收入 | 低风险，不影响主业 |
| 宝妈 | 碎片化时间，需灵活安排 | 在家可做，时间自由 |

### 1.6 用户验证结果

已完成 10 人内容验证，获得强正面反馈。多人主动追问"明天还有吗"。核心假设成立。

---

## 2. 功能规格

### F1: 今日精选 Top 3（首页核心）

**描述**: 首页展示当日 AI 评分最高的 3 个副业案例卡片。

**用户故事**: 作为用户，我打开小程序就能看到今天最值得做的 3 个副业，快速判断哪个适合我。

**展示内容（每个卡片）**:
- 案例标题（<=30字）
- AI 总分（0-10，整数）
- 核心摘要（<=200字）
- 来源公众号名称
- 启动成本标签（如"零成本"、"500元内"）

**交互行为**:
- 点击卡片 → 进入案例详情页（F2）
- 下拉刷新 → 重新加载当日精选
- 无网络时显示缓存内容 + "网络不可用"提示

**边界情况**:

| 场景 | 处理 |
|------|------|
| 当天无精选数据 | 回退到最近一个有效日的精选 |
| 云函数查询超时 | 重试 1 次，失败显示"加载失败，下拉重试" |
| 案例已被下架(archived) | 跳过该案例，当日精选可能不足 3 个（由定时任务保证完整性） |

**数据来源**: 云函数 `getDailyPick`，查询 DailyPick 集合（按 date）→ Case 集合（按 case_ids $in 查询）。若无当天数据，回退到最近一个有数据的日期。不做历史高分补充（补充逻辑仅在定时任务 generateDailyPick 中执行）。

---

### F2: 案例详情页

**描述**: 展示单个案例的完整结构化信息，是产品最核心的页面。

**用户故事**: 作为用户，我想了解这个副业到底怎么做、要多少钱、能赚多少、有什么坑，然后决定是否值得尝试。

**页面结构（从上到下）**:

**① 案例头部**
- 标题
- AI 总分（大号数字 + 评分条可视化）
- 来源公众号名称 + 发布日期

**② 五维度评分展开**
- 落地可行性（0-3分）
- 收益潜力（0-2分）
- 时效性（0-2分）
- 实操细节（0-2分）
- 用户适配度（0-1分）
- 每个维度一行：名称 + 分数 + 进度条

**③ 核心信息卡片**
- 启动成本 | 预期收益 | 变现周期 | 适合人群
- 四个字段横排，每个带图标

**④ 操作步骤 Checklist**
- 渲染为数组，每步一行
- 每步前方有勾选框，可勾选
- 勾选后实时保存到云端（UserCollection.progress）
- 顶部显示"完成 X/N 步"

**⑤ 工具/资源**
- 列表展示案例所需工具/资源
- 每项包含名称和简要说明

**⑥ 避坑指南**
- 文本展示，重点标注风险关键词
- 风险标签（如"需保证金"、"可能违规"）红色高亮

**⑦ 底部操作栏（固定底部）**
- 收藏按钮（实心/空心切换）
- 分享按钮 → 触发分享卡片生成（F6）
- "阅读原文"链接 → 跳转公众号原始文章（source_url）
- "开启明日提醒"按钮 → 触发一次性订阅授权（F5）

**边界情况**:

| 场景 | 处理 |
|------|------|
| 案例不存在或已下架 | 显示"案例不存在或已下架" |
| source_url 已失效 | 链接可点击但可能打开失败，不特殊处理 |
| steps 字段为空 | 不显示 Checklist 区域 |
| 进度保存失败 | 提示"保存失败"，保留本地勾选状态 |

---

### F3: 历史榜单

**描述**: 按日期倒序浏览过往每日精选案例。

**用户故事**: 作为用户，我想回顾之前推荐过的案例，找到我错过的或想再看看的内容。

**页面结构**:
- 按日期分组，每组显示"X月X日 精选"
- 每组下展示 3 个案例卡片（复用首页卡片样式，但尺寸略小）
- 每页加载 7 天（21 个案例），滚动到底部加载下一页

**交互行为**:
- 点击案例卡片 → 进入案例详情页（F2）
- 滚动到底部 → 触发加载下一页
- 无更多数据 → 显示"没有更多了"

**数据来源**: 云函数 `getDailyPick`，分页查询 DailyPick 集合（按 date 倒序，skip/limit）。

---

### F4: 收藏功能

**描述**: 用户可收藏案例，在个人中心查看收藏列表（含步骤执行进度）。

**用户故事**: 作为用户，我想收藏感兴趣的案例，并在个人中心看到每个案例的执行进度。

**交互行为**:
- 案例详情页底部点击收藏按钮 → 收藏（心形变实心）→ 再次点击取消收藏
- 个人中心展示收藏列表，每个卡片显示：标题、评分、"完成 X/N 步"
- 点击收藏卡片 → 进入案例详情页（自动恢复勾选状态）

**数据模型**: UserCollection 集合，字段 openid + case_id + progress(JSON) + timestamps。

**边界情况**:

| 场景 | 处理 |
|------|------|
| 快速双击收藏 | debounce 300ms + 幂等检查 |
| 收藏列表为空 | 显示"还没有收藏案例，去看看今日精选吧" + 跳转首页按钮 |
| 并发勾选同一案例步骤 | 云函数用 updatedAt 乐观锁 |

---

### F5: 微信一次性订阅推送

**描述**: 用户查看案例时可订阅明日提醒，次日新案例上线后收到推送通知。

**用户故事**: 作为用户，我看完今天的案例后希望明天能收到提醒，这样不会错过新内容。

**流程**:
```
用户查看案例详情
  → 点击"开启明日提醒"按钮
  → 调用 wx.requestSubscribeMessage() [前端授权弹窗]
  → 用户授权（或拒绝）
  → 前端将授权结果（含 template_id）传给云函数
  → 云函数记录到 PushSubscription 集合（openid + template_id + authorized_at）
  → 次日定时任务检测到新 DailyPick
  → 云函数调用微信服务端 API subscribeMessage.send 发送通知 [服务端发送]
  → 用户打开通知 → 进入案例详情
  → 详情页再次引导授权（链式循环）
```

**限制**:
- 每次授权只能发**一条**消息
- 不支持固定时间推送，新内容就绪即推送
- 消息模板需提前在微信后台申请审核（2-3天）

**边界情况**:

| 场景 | 处理 |
|------|------|
| 用户拒绝授权 | 不再弹出，下次查看案例时自然引导 |
| 推送发送失败（API限频） | 批量发送时增加间隔（200ms/条），超出限额记录日志跳过 |
| 推送发送失败（其他） | 记录失败日志，不影响其他用户推送 |
| 用户卸载/长期未打开 | 推送无法送达，静默忽略 |

---

### F6: 案例分享卡片生成

**描述**: 在案例详情页生成精美的图片卡片，用户可保存到相册后分享朋友圈。

**用户故事**: 作为用户，我想把一个精彩案例分享给朋友，不是发一个灰色链接，而是一张好看的图片。

**卡片内容**:
- 案例标题（<=30字）
- AI 总分
- 一句精华摘要（<=50字）
- 小程序码（扫码直达该案例详情）

**技术实现**:
- 使用 Canvas 2D API（type="2d"），不用已废弃的 createCanvasContext
- 小程序码通过云函数调用 `wxacode.get` 生成，缓存在云存储
- 点击分享按钮 → 渲染 Canvas → canvasToTempFilePath → saveImageToPhotosAlbum

**降级方案**: Canvas 不可用时，降级为 `onShareAppMessage` 原生小程序分享（转发给好友）。渲染超时（>5秒）同样触发降级。

**边界情况**:

| 场景 | 处理 |
|------|------|
| Canvas API 不支持 | 降级为 onShareAppMessage 文字分享 |
| 小程序码获取失败 | 卡片不显示小程序码，其余正常 |
| 用户拒绝相册权限 | 提示"请在设置中允许保存图片" |
| 卡片渲染超时(>5秒) | 自动降级为原生分享 |

---

### F8: 事件埋点

### F7: 操作步骤 Checklist

**描述**: 案例详情页的操作步骤渲染为可勾选清单，勾选状态云端保存。

**用户故事**: 作为用户，我想标记我完成了哪些步骤，下次回来能看到执行进度。

**数据结构**:
- Case.steps: `[{"step": "描述文本", "order": 1}, {"step": "描述文本", "order": 2}]`
- UserCollection.progress: `{"step_1": true, "step_2": false, "step_3": true}`
- 映射关系: progress 的 key 格式为 `step_{order}`

**交互行为**:
- 点击勾选框 → 即时勾选动画 → 调用云函数保存 → 失败则回退勾选状态
- 顶部显示"完成 2/5 步"进度文字
- 收藏列表中显示进度

---

**降级方案**: Canvas 不可用时，降级为 `onShareAppMessage` 原生小程序分享（转发给好友）。渲染超时（>5秒）同样触发降级。

**描述**: 记录用户关键行为事件，用于试运营期间数据分析。

**埋点事件列表**:

| 事件名 | 触发时机 | 必填字段 | 可选字段 |
|--------|---------|---------|---------|
| page_view | 每次页面加载 | openid, page_name, date | - |
| case_click | 点击案例卡片 | openid, case_id, date | - |
| case_collect | 收藏/取消收藏 | openid, case_id, date | action(collect/uncollect) |
| case_share | 生成分享卡片 | openid, case_id, date | - |
| subscribe | 订阅推送 | openid, date | - |

**数据存储**: NoSQL Analytics 集合。

**试运营日报查询**:
- 日活: `db.collection('analytics').where({event:'page_view', date:'YYYY-MM-DD'}).count()`
- 案例点击率: `case_click 数 / page_view 数`
- 收藏率: `case_collect 数 / case_click 数`
- 分享率: `case_share 数 / case_click 数`

---

## 3. 页面规格

### 3.1 页面清单

| 页面 | 路径 | TabBar | 说明 |
|------|------|--------|------|
| 首页 | pages/index/index | 是 | 今日精选 Top3 + 历史榜单入口 |
| 案例详情 | pages/case/detail | 否 | 评分+步骤+工具+避坑+分享+收藏 |
| 历史榜单 | pages/history/index | 是 | 按日期倒序，分页加载 |
| 个人中心 | pages/profile/index | 是 | 收藏列表+订阅状态 |

### 3.2 项目目录结构

```
src/
├── api/                     # API 层（数据访问）
│   ├── core/                # 核心配置
│   │   └── cloud.ts         # CloudBase SDK 实例 + 云函数调用封装
│   └── modules/             # 业务 API 模块
│       ├── daily.ts         # getDailyPick, getHistoryPicks
│       ├── case.ts          # getCaseDetail
│       ├── collection.ts    # getUserCollections, toggleCollection
│       └── analytics.ts     # trackEvent
├── components/              # 全局组件
│   ├── case-card/           # 案例卡片（首页+历史复用）
│   └── score-bar/           # 评分进度条
├── composables/             # 组合式函数
│   ├── useAuth.ts           # OpenID 静默登录
│   └── useShareCard.ts      # Canvas 分享卡片生成
├── pages/                   # 页面
│   ├── index/               # 首页（今日精选）
│   ├── case/                # 案例详情
│   ├── history/             # 历史榜单
│   └── profile/             # 个人中心
├── store/                   # Pinia 状态管理
│   ├── index.ts
│   └── modules/
│       ├── daily.ts         # 当日精选状态
│       └── collection.ts    # 收藏列表状态
├── types/                   # TypeScript 类型
│   └── models.d.ts          # Case, DailyPick, UserCollection 等类型
├── utils/                   # 工具函数
│   ├── cloudbase.ts         # CloudBase 初始化 + OpenID 登录
│   ├── format.ts            # 日期格式化（统一 YYYY-MM-DD HH:mm:ss）
│   └── index.ts             # 通用工具函数
├── App.vue
├── main.ts
└── theme.json               # 主题配置

cloudfunctions/
├── _shared/                 # 共享模块（需复制到各函数目录）
│   ├── db.js                # 数据库初始化 + 公共查询
│   ├── auth.js              # openid 提取 + 输入校验
│   ├── wechat-api.js        # access_token 缓存 + 刷新
│   └── response.js          # 统一响应格式
├── getDailyPick/
├── getCaseDetail/
├── getUserCollections/
├── toggleCollection/
├── trackEvent/
├── subscribeMessage/
├── generateDailyPick/
└── syncCaseData/            # 同步本地结构化数据到 NoSQL
```

### 3.3 导航结构

```
TabBar
├── 首页 (index)
│   ├── 点击案例卡片 → 案例详情 (navigateTo)
│   └── "历史榜单"入口 → 历史榜单 (switchTab)
├── 历史榜单 (history)
│   └── 点击案例卡片 → 案例详情 (navigateTo)
└── 个人中心 (profile)
    └── 点击收藏案例 → 案例详情 (navigateTo)
```

### 3.4 删除的页面

以下模板页面需删除（不适用于本产品）：
- pages/demo/demo.vue
- pages/login/index.vue
- pages/login/email-login.vue
- pages/login/phone-login.vue
- pages/login/password-login.vue

### 3.5 页面加载性能要求

- 首屏加载 <= 3 秒（含网络请求）
- 页面切换 <= 500ms
- 列表滚动流畅（60fps）

---

## 4. 数据模型

### 4.1 Case（案例）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | CloudBase 自动生成 |
| id | string | 是 | 自增编号，从 100001 起 |
| title | string | 是 | 案例标题，<=50字 |
| source_account | string | 是 | 来源公众号名称 |
| source_url | string | 是 | 原文链接 |
| summary | string | 是 | 核心摘要，<=200字 |
| score_total | number | 是 | 总分 0-10（整数，=五维度之和） |
| score_feasibility | number | 是 | 落地可行性 0-3（整数） |
| score_profit | number | 是 | 收益潜力 0-2（整数） |
| score_timeliness | number | 是 | 时效性 0-2（整数） |
| score_detail | number | 是 | 实操细节 0-2（整数） |
| score_fitness | number | 是 | 用户适配度 0-1（整数） |
| cost | string | 是 | 启动成本描述 |
| expected_revenue | string | 是 | 预期收益描述 |
| cycle | string | 是 | 变现周期描述 |
| steps | array | 否 | 操作步骤 `[{step:string, order:number}]` |
| tools | array | 否 | 工具/资源 `[{name:string, desc:string}]` |
| pitfalls | string | 否 | 避坑指南 |
| suitable_for | string | 是 | 适合人群 |
| risk_tags | array | 否 | 风险标签 `[string]` |
| status | string | 是 | pending/reviewed/published/archived |
| is_classic | boolean | 否 | 是否经典回顾，default false |
| created_at | date | 自动 | 创建时间 |
| published_at | date | 否 | 发布时间 |

**约束**: score_total = score_feasibility + score_profit + score_timeliness + score_detail + score_fitness（整数加法，不允许小数）

**日期格式约定**: 所有时间字段统一使用 `YYYY-MM-DD HH:mm:ss`（北京时间），date 字段使用 `YYYY-MM-DD`。

### 4.2 DailyPick（每日精选）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | CloudBase 自动生成 |
| date | string | 是 | YYYY-MM-DD 格式，唯一索引 |
| case_ids | array | 是 | 当日 3 个案例 ID 数组 `[string]` |
| created_at | date | 自动 | 创建时间 |

### 4.3 UserCollection（用户收藏 + 进度）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | CloudBase 自动生成 |
| openid | string | 是 | 用户唯一标识 |
| case_id | string | 是 | 案例 ID |
| progress | object | 否 | 步骤勾选状态 `{"step_1": true, ...}` |
| created_at | date | 自动 | 收藏时间 |
| updated_at | date | 自动 | 最后更新时间 |

**索引**: (openid, case_id) 复合唯一索引

### 4.4 PushSubscription（推送订阅）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | CloudBase 自动生成 |
| openid | string | 是 | 用户唯一标识 |
| template_id | string | 是 | 消息模板 ID |
| subscribed_at | string | 是 | 授权时间（YYYY-MM-DD HH:mm:ss） |

### 4.6 SystemLog（运维日志）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | CloudBase 自动生成 |
| type | string | 是 | 日志类型（cron_success/cron_error/api_error） |
| function_name | string | 是 | 云函数名称 |
| detail | string | 否 | 详细信息（错误消息等） |
| created_at | string | 是 | 日志时间（YYYY-MM-DD HH:mm:ss） |

### 4.7 WechatToken（微信 API Token 缓存）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | 固定文档 ID（如 "access_token"） |
| token | string | 是 | access_token 值 |
| expire_at | string | 是 | 过期时间（YYYY-MM-DD HH:mm:ss） |

---

### 4.5 Analytics（埋点）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| _id | string | 自动 | CloudBase 自动生成 |
| openid | string | 是 | 用户唯一标识 |
| event | string | 是 | 事件名 |
| case_id | string | 否 | 关联案例 ID（page_view/subscribe 事件无此字段） |
| date | string | 是 | YYYY-MM-DD |
| created_at | date | 自动 | 事件时间 |

---

## 5. API 规格（云函数）

### 5.1 getDailyPick

**用途**: 获取指定日期的精选案例列表。

**入参**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| date | string | 否 | YYYY-MM-DD，默认当天 |

**出参**:

```json
{
  "success": true,
  "data": {
    "date": "2026-04-21",
    "cases": [
      {
        "id": "100001",
        "title": "...",
        "summary": "...",
        "score_total": 8.5,
        "cost": "零成本",
        "source_account": "...",
        "suitable_for": "..."
      }
    ]
  }
}
```

**查询逻辑**:
1. 查 DailyPick 集合 where({date})
2. 若无结果，查最近一个有数据的 date（兜底）
3. 用 case_ids $in 查 Case 集合，过滤 status=published
4. 返回结果（不在此函数中做历史高分补充）

### 5.2 getCaseDetail

**用途**: 获取单个案例完整详情。

**入参**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| case_id | string | 是 | 案例编号 |

**出参**: Case 集合完整文档。

**查询逻辑**:
1. 查 Case 集合 where({id: case_id, status: 'published'})
2. 无结果返回 {success: false, error: "NOT_FOUND"}

### 5.3 getUserCollections

**用途**: 获取当前用户收藏列表（含步骤进度）。

**入参**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 10 |

**出参**:

```json
{
  "success": true,
  "data": {
    "total": 5,
    "list": [
      {
        "case_id": "100001",
        "title": "...",
        "score_total": 8.5,
        "progress": {"step_1": true, "step_2": false},
        "steps_count": 5,
        "completed_count": 1
      }
    ]
  }
}
```

**查询逻辑**:
1. 从 wxContext 获取 openid（不信任客户端传参）
2. 查 UserCollection where({openid})，按 updated_at 倒序，skip/pageSize 分页
3. 收集所有 case_id，单次 Case.$in 批量查询获取 title、score_total、steps（避免 N+1 查询）

### 5.4 toggleCollection

**用途**: 收藏/取消收藏 + 保存 Checklist 进度。

**入参**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| case_id | string | 是 | 案例编号 |
| action | string | 是 | "collect" / "uncollect" |
| progress | object | 否 | 步骤勾选状态 |

**出参**: `{success: true, data: {collected: true}}`

**逻辑**:
1. 从 wxContext 获取 openid
2. action=collect: 查是否已存在，不存在则创建，存在则用完整记录模式更新 progress（读取现有记录 → 合并 progress → 写回完整记录）
3. action=uncollect: 删除记录
4. 并发保护：先查后写（幂等）

### 5.5 trackEvent

**用途**: 埋点事件上报。

**入参**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| event | string | 是 | 事件名 |
| case_id | string | 否 | 关联案例 |
| extra | object | 否 | 额外数据 |

**逻辑**:
1. 从 wxContext 获取 openid
2. 写入 Analytics 集合（fire-and-forget，不阻塞主流程）

### 5.6 subscribeMessage

**用途**: 发送一次性订阅消息（由定时任务调用）。

**入参**: 无（内部遍历 PushSubscription 集合调用）

**逻辑**:
1. 从 WechatToken 集合获取 access_token（若过期则调用微信 API 刷新并缓存）
2. 查 PushSubscription 集合，获取所有待推送用户
3. 批量发送，每条间隔 200ms 避免触发微信 API 限频
4. 调用微信服务端 API `subscribeMessage.send`（注意：不是前端 API `wx.requestSubscribeMessage`）
5. 发送成功后删除该条订阅记录（一次性用完）
6. 发送失败记录到 SystemLog，跳过该用户
7. 发送完成后写入 SystemLog 记录执行结果（成功数/失败数）

### 5.7 generateDailyPick（定时任务）

**用途**: 每日定时从未发布案例中选取 Top 3。

**Cron**: CloudBase 7 段格式，每日早上 6:00 执行 `0 0 6 * * * *`

**逻辑**:
1. 查询所有已存在的 DailyPick 记录的 case_ids（去重后的已用案例集合）
2. 查 Case 集合 where({status: 'published'})，排除步骤 1 中已用过的 case_id
3. 按 score_total 倒序取前 3 个
4. 若不足 3 个：从已用过的案例中按 score_total 倒序补充（经典回顾）
5. 写入 DailyPick 集合 {date: 今天, case_ids: [id1, id2, id3]}
6. 触发 subscribeMessage 给已订阅用户发送通知
7. 写入 SystemLog 记录执行结果（成功/失败 + 选取的案例 ID）

---

## 6. 用户认证

**方式**: 微信小程序静默登录。

**流程**:
1. 用户打开小程序 → 调用 `wx.login()` 获取 code
2. 云函数通过 `wxContext.OPENID` 获取用户唯一标识
3. 不需要显式注册/登录页面
4. openid 作为收藏、推送、埋点的唯一标识

**安全要求**:
- 所有云函数必须从 wxContext 获取 openid，**永远不从客户端参数接收 openid**
- 云函数入参校验：case_id 必须是数字字符串，progress 必须是有效 JSON
- 统一错误响应格式：`{success: true/false, data: {...}, error: string}`

**NoSQL 更新模式**:
- 所有 update 操作必须使用完整记录模式（先读取现有记录 → 合并变更字段 → 写回完整记录）
- 避免部分更新导致数据丢失

---

## 7. 内容管道

### 7.1 整体流程

```
┌─────────────── 本地侧 ───────────────┐   ┌──── 云端 ────┐
│                                      │   │              │
│ ① 运营人员手动筛选公众号文章 URL       │   │              │
│           ↓                          │   │              │
│ ② Chrome CDP 下载工具抓取文章         │   │              │
│    (scripts/article-downloader/)      │   │              │
│    输出: resources/raw/{编号}/         │   │              │
│           ↓                          │   │              │
│ ③ LLM 评分 + 结构化提取               │   │              │
│    (本地脚本)                         │   │              │
│    输出: resources/processed/{编号}/   │   │              │
│    - 5维度评分 + 7字段提取 + 脱敏      │   │              │
│           ↓                          │   │              │
│ ④ AI审核评分结果                     │   │              │
│    确认或调整后标记 reviewed            │   │              │
│           ↓                          │   │              │
│ ⑤ 云函数同步到 NoSQL Case 集合        │ → │ ⑥ 写入 NoSQL │
│                                      │   │              │
│                                      │   │ ⑦ 定时任务   │
│                                      │   │ 选取 Top 3    │
│                                      │   │ 写入 DailyPick│
│                                      │   │              │
└──────────────────────────────────────┘   └──────────────┘
```

### 7.2 已实现部分

- Chrome CDP 下载工具: `scripts/article-downloader/`（完整可用）
- 已有 2 篇测试文章

### 7.3 待实现部分

- 本地 LLM 评分脚本（调用 minimax-2.7 模型）
- 结构化 MD 生成（本地中间产物）
- 云函数同步脚本（解析 MD → 写入 NoSQL）
- 定时任务（generateDailyPick）

### 7.4 LLM 评分规格

**输入**: 案例 Markdown 全文
**输出**: JSON 格式

```json
{
  "score_feasibility": 2.5,
  "score_profit": 1.5,
  "score_timeliness": 1.5,
  "score_detail": 1.5,
  "score_fitness": 0.8,
  "summary": "一句话核心摘要",
  "steps": [{"step": "描述", "order": 1}],
  "tools": [{"name": "工具名", "desc": "说明"}],
  "pitfalls": "避坑指南文本",
  "suitable_for": "适合人群",
  "cost": "启动成本",
  "expected_revenue": "预期收益",
  "cycle": "变现周期",
  "risk_tags": ["风险标签1"]
}
```

**校验规则**: score_total = score_feasibility + score_profit + score_timeliness + score_detail + score_fitness（整数加法，LLM prompt 必须指定 "所有评分为整数，不允许小数"）

**异常处理**: JSON 解析失败或分数不匹配 → 标记 pending，不重试 LLM，人工审核后手动修正。

**LLM Prompt 要求**: 所有评分字段必须为整数（0, 1, 2, 3），不允许小数。输出 JSON 示例中评分值应为 `"score_feasibility": 2` 而非 `2.5`。

**成本估算**: ~2000 token/篇，约 0.01 元/篇，每周约 1-3 元。

### 7.5 内容脱敏

LLM 评分管道中增加正则脱敏步骤，过滤以下模式：
- 手机号码（1[3-9]\d{9}）
- 微信号（"微信号: xxx"）
- 身份证号（\d{17}[\dXx]）
- 电子邮箱

人工审核时二次检查脱敏结果。

### 7.6 兜底机制

当日新案例不足 3 个时，从历史高分已发布案例中重新推荐。is_classic 字段标记是否为经典回顾（用户侧标签延后到后续迭代）。

---

## 8. 非功能需求

### 8.1 性能

| 指标 | 目标 |
|------|------|
| 首屏加载 | <= 3秒 |
| 页面切换 | <= 500ms |
| 云函数响应 | <= 200ms (p95) |
| 分享卡片渲染 | <= 2秒 |

### 8.2 安全

| 要求 | 实现方式 |
|------|---------|
| 用户身份 | 云函数通过 wxContext.OPENID 获取，不信任客户端 |
| 数据隔离 | 所有查询强制带 openid 条件 |
| 输入校验 | 云函数入参类型和格式校验 |
| 限频 | getCaseDetail 20次/分钟/用户，toggleCollection 10次/分钟/用户 |
| 内容安全 | LLM 评分管道包含脱敏步骤 |

### 8.3 可用性

| 场景 | 处理 |
|------|------|
| 无网络 | 显示缓存内容 + 错误提示 |
| 云函数超时 | 重试 1 次 + 友好提示 |
| 首页无精选数据 | 回退到最近有效日 |
| 分享卡片生成失败 | 降级为原生 onShareAppMessage |

---

## 9. 部署与发布

### 9.1 上线前置条件

| # | 条件 | 状态 |
|---|------|------|
| 1 | 已注册的小程序 AppID 配置到 manifest.json 和 project.config.json | 待配置 |
| 2 | 微信后台隐私政策文档 | 已准备 |
| 3 | 一次性订阅消息模板 ID（审核通过） | 已准备 |
| 4 | wxacode.get API 权限已开通 | 已准备 |
| 5 | CloudBase 环境已开通 NoSQL 数据库 | 已准备 |
| 6 | 配置真实 CloudBase 环境 ID（替换 cloudbaserc.json 和 cloudbase.ts 中的占位符） | 待配置 |

### 9.2 部署顺序

1. 创建 NoSQL 集合（Case, DailyPick, UserCollection, PushSubscription, Analytics, SystemLog, WechatToken）
2. 创建集合索引（含 UserCollection 的 openid+case_id 复合唯一索引、DailyPick 的 date 唯一索引）
3. 创建云函数共享模块 `_shared/`（db.js, auth.js, wechat-api.js, response.js），并复制到各云函数目录
4. 部署空壳云函数（7个函数，返回 mock 数据）→ 前端可并行开发
5. 填充云函数业务逻辑 + 部署更新
6. 配置定时触发器（generateDailyPick，Cron: `0 0 6 * * * *`）
7. 前端代码构建 + 上传审核

### 9.3 回滚计划

- 云函数回滚：重新部署旧版本（秒级）
- 前端回滚：提交新版本审核（1-3天），紧急时退回上一审核通过版本
- NoSQL：新增字段向后兼容，无需回滚

---

## 10. 成功指标

| 指标 | 目标 | 采集方式 |
|------|------|---------|
| 注册用户 | 300+ (15天内) | Analytics page_view 去重 openid |
| 次日留存 | > 30% | Analytics page_view 按日期对比 |
| 案例点击率 | > 40% | case_click / page_view |
| 收藏率 | > 15% | case_collect / case_click |
| 分享率 | > 5% | case_share / case_click |
| 内容好评率 | > 70% | 微信群收集反馈 |

---

## 11. 不在 MVP 范围内

| 功能 | 延后原因 | 解锁条件 |
|------|---------|---------|
| 用户画像匹配问卷 | 时间压力 | D1 留存 > 30% |
| "经典回顾"用户侧标签 | 非紧急 | 出现首次重复推荐 |
| 阅读进度/已读未读 | 非核心 | 日均打开 > 1次 |
| "我在做"状态标签 | 非核心 | Checklist 使用率 > 30% |
| 埋点分析仪表盘 | 试运营用脚本 | 试运营结束 |
| 用户评论区 | 用微信群替代 | 日活稳定 500+ |
| 小红书/抖音一键生成文案 | 平台限制 | 产品验证成功 |
| MD 静态托管渲染 | 架构决策砍掉 | 改用纯 NoSQL |
| 副业工具库 | 非核心 | 产品验证成功 |
| 实操打卡 | 非核心 | 产品验证成功 |

---

## 12. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 内容管道供给不足 | 中 | 高 | 经典回顾兜底机制 + 提前储备 100 篇 |
| LLM 评分不准确 | 中 | 中 | 人工二次审核 + 异常回退队列 |
| 小程序审核不通过 | 低 | 高 | 已确认类目合规 + 审核介绍已准备 |
| 种子用户获取困难 | 中 | 中 | 个人社交网络 + 相关社群 + 10人验证者口碑传播 |
| 定时任务执行失败 | 低 | 高 | getDailyPick 回退到最近有效日 + SystemLog 运维日志 |
| Canvas 分享卡片兼容性 | 中 | 低 | 降级为 onShareAppMessage 原生分享 |
| 内容脱敏遗漏 | 低 | 中 | 人工审核二次检查 + 投诉入口 |
| 微信 API 限频 | 中 | 中 | subscribeMessage 批量发送间隔 200ms + 限频时跳过并记录日志 |
| AppID 未配置 | 低 | 高 | manifest.json 中 mp-weixin.appid 为空，阻塞真机调试 |
