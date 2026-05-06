# Content Discoverer 设计文档

> 日期：2026-05-06
> 状态：已确认

## 概述

内容管道新增「公众号内容发现」环节，自动从目标公众号和关键词搜索中筛选候选文章 URL，替代人工寻找文章的环节。

## 目标

- 从存量文章自动总结入选标准
- 自动扫描公众号历史文章和关键词搜索结果
- 用 LLM 评估候选文章是否符合入选标准
- 输出纯 URL 列表文件，供 article-downloader 下一步消费

## 方案选择

**选定：两阶段工具（Phase 1 扫描 + Phase 2 评估）**

职责分离，扫描结果可持久化复用，评估参数可反复调整无需重新扫描。

放弃的方案：
- 一体化单次运行：无法独立调试扫描/评估
- 三个微工具：对两个来源过度拆分

## 架构

```
scripts/content-discoverer/
├── src/
│   ├── index.ts          # CLI 入口（commander），子命令路由
│   ├── scanner.ts        # Phase 1: 扫描公众号 + 关键词搜索
│   ├── evaluator.ts      # Phase 2: LLM 评估候选文章
│   ├── criteria.ts       # 从存量文章总结入选标准
│   └── types.ts          # 类型定义
├── config.ts             # 公众号列表、搜索关键词、选择器配置
├── package.json
└── README.md
```

### CDP 复用策略

**不新建 CDP 客户端**。直接从 `article-downloader/capture.ts` 导入已有的 `CdpConnection`、`evaluateScript`、`autoScroll`、`waitForPageLoad`、`waitForNetworkIdle`、`launchChrome`、`findExistingChromePort` 等函数。

实现方式：在 `package.json` 中将 `article-downloader` 声明为本地依赖：

```json
{
  "dependencies": {
    "article-downloader": "file:../article-downloader"
  }
}
```

导入路径：`import { CdpConnection, evaluateScript, ... } from "article-downloader/capture.js"`。

**前置条件**：`article-downloader/package.json` 需添加 `"exports"` 字段以支持 ESM 子路径导入：

```json
{
  "exports": {
    "./capture.js": "./capture.ts"
  }
}
```

若不想修改 article-downloader 的 package.json，可改用相对路径导入：`import { ... } from "../article-downloader/capture.ts"`。

### 数据流

```
resources/processed/*.md  ──→  criteria.ts 总结入选标准 → resources/criteria.json
                                                                    ↓
Chrome CDP  ──→  scanner.ts 扫描  ──→  resources/candidates.json（增量写入）
                                                                    ↓
              evaluator.ts 评估    ──→  resources/discovered-urls.txt
```

## 搜狗微信搜索：已知限制与应对

搜狗微信搜索（`weixin.sogou.com`）存在反爬机制：IP 频率限制、Cookie 指纹检测、验证码。本工具的应对策略：

1. **依赖已登录的 Chrome 实例**：复用 article-downloader 的 Chrome profile（已登录微信），降低被拦截概率
2. **请求间隔**：每次搜索/翻页操作之间加 3-5s 随机延迟
3. **验证码检测**：CDP 检测页面是否包含验证码元素（搜狗验证码页面特征：URL 包含 `/antispider/` 或页面含 `#captcha`），暂停并提示：
   ```
   [!] 检测到验证码，请在浏览器中手动完成验证后按 Enter 继续...
   ```
4. **扫描中断恢复**：candidates.json 增量写入（每个账号/关键词完成后立即持久化），中断后重新运行自动跳过已扫描项
5. **回退方案**：支持手动输入模式 `npx discover manual`，从 `manual-urls.txt` 读取 URL 列表跳过扫描阶段直接进入评估

## Phase 1: 扫描（scanner.ts）

### 两种扫描模式

**模式 1：固定公众号扫描**

1. CDP 连接 Chrome → 打开搜狗微信搜索首页
2. 在搜索框输入公众号名称 → 选择"搜公众号"类型 → 点击搜索
3. 在搜索结果中点击第一个匹配的公众号 → 进入该号的历史文章列表页
4. 自动滚动加载更多文章（复用 `autoScroll`，最多 8 步）
5. JS 提取每篇文章的 `{ url, title, excerpt, date }`
6. URL 归一化：通过 CDP 点击每个链接并读取最终跳转 URL，将搜狗中间链接解析为 `mp.weixin.qq.com` 原始链接
7. 去重（对比已有文章）
8. 每完成一个账号，立即追加写入 `candidates.json`
9. 逐个公众号循环

**模式 2：关键词搜索**

1. CDP 连接 Chrome → 打开搜狗微信搜索首页
2. 在搜索框输入关键词 → 选择"搜文章"类型 → 点击搜索
3. 选择按时间排序（最近优先）
4. 自动翻页（默认最多 5 页，可配置）
5. 每页提取文章元数据 + URL 归一化 + 去重
6. 每完成一个关键词，立即追加写入 `candidates.json`

### 搜狗页面交互选择器（可配置）

页面选择器定义在 `config.ts` 中，便于搜狗改版后快速调整：

```typescript
selectors: {
  searchBox: "#query",
  searchButton: ".swz2",
  searchTypeAccount: "a[href*='type=1']",
  searchTypeArticle: "a[href*='type=2']",
  accountResult: ".txt-box h3 a",
  articleItem: ".news-list li",
  articleTitle: ".txt-box h3 a",
  articleExcerpt: ".txt-box p",
  articleDate: ".s-p .s2",
  articleUrl: ".txt-box h3 a[href]",
  loadMoreButton: ".load-more",
  captchaIndicator: "#captcha, .antispider",
  timeSortTab: "a[href*='sort=time']",
}
```

### URL 归一化

搜狗返回的链接是中间跳转 URL（如 `https://weixin.sogou.com/link?url=...`）。扫描时必须解析为最终 URL：

1. 通过 CDP 执行 JS 获取链接的 `href` 属性
2. 如果 URL 域名不是 `mp.weixin.qq.com`，通过 CDP `Page.navigate` 到该链接并读取 `Page.navigatedWithinDocument` 或最终 URL
3. 仅保留域名为 `mp.weixin.qq.com` 的 URL，其余丢弃
4. 去除 URL 中的跟踪参数，仅保留 `__biz`、`mid`、`idx` 三个核心参数，移除其余所有查询参数（`sn`、`ch`、`pass_ticket`、`scene`、`subscene`、`clicktime`、`enterid`、`devicetype`、`version` 等）

归一化后的 URL 才存入 candidates.json，确保与 `source_url` 去重比较时格式一致。

### 去重逻辑

1. 启动时扫描 `resources/raw/` 和 `resources/processed/`，从 frontmatter 的 `source_url` 字段提取所有已有 URL
2. 加载 `resources/candidates.json`（如存在上次结果）
3. 三者取并集作为"已存在"集合
4. 扫描时实时过滤，跳过已存在的 URL

### 增量写入与恢复

- `candidates.json` 不是扫描结束后一次性写入，而是每完成一个账号/关键词就追加
- 启动时如发现 `candidates.json` 已存在，记录其中已扫描的 `source` 列表
- 扫描时跳过已完成的 source，从中断处继续
- 提供 `--clean` 参数清除已有候选重新全量扫描

### 输出

`resources/candidates.json`：

```typescript
interface CandidateArticle {
  url: string;          // 归一化后的 mp.weixin.qq.com URL
  title: string;
  excerpt: string;      // 摘要前 100 字
  date: string;         // YYYY-MM-DD 格式
  source: string;       // "account:公众号名" or "keyword:关键词"
  scannedAt: string;    // ISO 时间戳，用于增量恢复
}
```

### 进度输出

遵循现有工具的进度报告风格：

```
[account 1/5] 副业实战笔记 → 已加载 23 篇文章 (去重后 15 篇)
[account 2/5] 创业指南 → 已加载 18 篇文章 (去重后 12 篇)
[keyword 1/3] "副业" 第1页 → 10 篇 | 第2页 → 10 篇 | 共 20 篇 (去重后 8 篇)
[keyword 2/3] "小成本创业" 第1页 → 10 篇 | 共 10 篇 (去重后 5 篇)
扫描完成：共 40 篇候选（去重后）
```

### CLI

```bash
npx discover scan                      # 扫描全部
npx discover scan --accounts-only      # 仅固定公众号
npx discover scan --keywords-only      # 仅关键词搜索
npx discover scan --max-pages 3        # 限制翻页数
npx discover scan --clean              # 清除已有候选，重新全量扫描
npx discover manual                    # 手动模式：从 manual-urls.txt 读取 URL 跳过扫描
```

## Phase 2: 评估（criteria.ts + evaluator.ts）

### criteria.ts — 总结入选标准

1. 读取 `resources/processed/` 下所有 MD 文件
2. 提取 `tags`、`score_total`、`title`、`summary`、`case_story` 前 300 字
3. 打包发给 LLM，prompt 要求总结入选模式
4. 结果缓存到 `resources/criteria.json`
5. 支持 `--refresh-criteria` 强制重新生成

### criteria.json schema

```typescript
interface SelectionCriteria {
  summary: string;              // 入选标准描述（一段自然语言）
  coreThemes: string[];         // 核心主题方向（如 ["副业", "自媒体", "小成本创业"]）
  coreTags: string[];           // 高频标签（从存量文章 tags 中提取）
  scoreDistribution: string;    // 评分分布特征描述（如 "大部分 score_total ≥ 7，feasibility ≥ 2"）
  searchKeywords: string[];     // 搜索关键词建议（10-20 个）
  negativeSignals: string[];    // 排除信号（如 "纯广告", "无实操步骤", "标题党"）
  generatedAt: string;          // ISO 时间戳
}
```

evaluator.ts 从 `criteria.json` 读取上述字段，构造 LLM prompt 的 system message。

### evaluator.ts — 评估候选文章

1. 读取 `resources/candidates.json` + `resources/criteria.json`
2. 批量评估：每批 10 篇发送给 LLM（batchSize 可调，取决于 token 预算，10 为初始值）
3. LLM prompt 结构：
   - System: `criteria.summary` + `coreThemes` + `negativeSignals` + `scoreDistribution`
   - User: 每篇文章的 `{ title, excerpt, date, source }`
   - 输出：`{ url, pass: boolean, score: number (1-10), reason: string }`
4. 收集 `pass: true` 的文章，按 `score` 降序排列
5. 输出 `resources/discovered-urls.txt`（每行一个 URL，按 score 降序排列）
6. 同时输出 `resources/discovered-metadata.json`，包含每篇入选文章的 `{ url, score, reason }`，供人工审核时参考

### LLM 模型与 SDK 配置

复用 article-processor 的配置：
- 模型：`MiniMax-M2.7`
- Base URL：`https://api.minimaxi.com/anthropic`
- SDK：`@anthropic-ai/sdk`，设置 `baseURL`
- API Key：通过环境变量 `MINIMAX_API_KEY` 传入（与 article-processor 一致）

### CLI

```bash
npx discover evaluate                      # 评估所有候选
npx discover evaluate --refresh-criteria   # 重新总结标准

# 一键运行
npx discover scan && npx discover evaluate
```

~~`--top N`~~ 已移除。评估结果全部输出，人工从 `discovered-urls.txt` 中选择即可。LLM 返回的 score 仅用于内部排序（score 高的排前面），不影响输出完整性。

## 配置

### config.ts

```typescript
interface DiscoverConfig {
  accounts: string[];           // 公众号名称列表
  keywords: string[];           // 搜索关键词列表
  maxPages: number;             // 关键词搜索最大翻页数 (默认 5)
  batchSize: number;            // LLM 评估每批数量 (默认 10，可据 token 预算调整)
  scanDelayMs: [number, number]; // 请求间随机延迟范围 (默认 [3000, 5000])
  sogouSearchUrl: string;       // 默认 "https://weixin.sogou.com"
  outputDir: string;            // 默认 "resources" (相对于项目根目录)
  selectors: { ... };           // 搜狗页面选择器 (见上方)
}
```

配置通过 CLI 参数覆盖（使用 commander），不引入单独的 JSON 配置文件。与现有工具保持一致（article-processor 用 commander + env vars）。

环境变量：
- `MINIMAX_API_KEY` — LLM API 密钥（与 article-processor 共用）
- `CHROME_REMOTE_DEBUGGING_PORT` — Chrome CDP 端口（可选，默认自动检测）

## 边界情况

| 场景 | 处理方式 |
|------|---------|
| 搜狗反爬/验证码 | 检测验证码页面，暂停等用户手动处理；3 次验证码后终止扫描，保留已有结果 |
| 搜狗页面结构变更 | 选择器可配置，更新 `config.ts` 中的 selectors 即可 |
| candidates.json 不存在 | evaluate 报错退出，提示先运行 scan |
| 扫描中途崩溃 | candidates.json 增量写入，重新运行自动从中断处继续 |
| 零篇存量文章 | criteria 跳过，评估仅基于 title/excerpt 做相关性判断，不生成入选标准 |
| 全部候选被过滤 | 输出空 discovered-urls.txt + 日志提示 |
| LLM API 限流 | 每批之间加 2s 间隔，重试 3 次，指数退避 |
| URL 归一化失败 | 跳过该 URL 并记录警告日志 |
| 公众号名称搜索无结果 | 跳过并记录，继续下一个账号 |

## 与现有管道衔接

```
content-discoverer  →  discovered-urls.txt  →  article-downloader 逐行读取 URL
```

article-downloader 当前接受单 URL 参数。本次不改造 article-downloader，人工从 txt 文件逐行复制 URL 即可。

## 依赖

- `article-downloader`（本地依赖）— CDP 连接、页面操控
- `@anthropic-ai/sdk` — LLM API 调用
- `commander` — CLI 参数解析
- `gray-matter` — 读取 MD 文件 frontmatter（用于去重和 criteria 提取）
