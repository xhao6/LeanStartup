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
│   ├── index.ts          # CLI 入口，子命令路由
│   ├── cdp.ts            # 精简版 CDP 客户端（连接、导航、执行 JS）
│   ├── scanner.ts        # Phase 1: 扫描公众号 + 关键词搜索
│   ├── evaluator.ts      # Phase 2: LLM 评估候选文章
│   ├── criteria.ts       # 从存量文章总结入选标准
│   └── types.ts          # 类型定义
├── config.ts             # 公众号列表、搜索关键词等配置
├── package.json
└── README.md
```

### 数据流

```
resources/processed/*.md  ──→  criteria.ts 总结入选标准 → resources/criteria.json
                                                                    ↓
Chrome CDP  ──→  scanner.ts 扫描  ──→  resources/candidates.json
                                                                    ↓
              evaluator.ts 评估    ──→  resources/discovered-urls.txt
```

## Phase 1: 扫描（scanner.ts）

### 两种扫描模式

**模式 1：固定公众号扫描**

1. CDP 连接 Chrome → 打开搜狗微信搜索（`weixin.sogou.com`）
2. 输入公众号名称 → 进入该号的历史文章列表页
3. 自动滚动加载更多文章
4. JS 提取每篇文章的 `{ url, title, excerpt, date }`
5. 去重（对比 resources/raw/ + resources/processed/ 已有 URL）
6. 逐个公众号循环汇总

**模式 2：关键词搜索**

1. CDP 连接 Chrome → 打开搜狗微信搜索
2. 输入关键词 → 按时间排序（最近优先）
3. 自动翻页（默认最多 5 页，可配置）
4. 提取 + 去重

**为什么选搜狗微信搜索**：普通浏览器可直接访问，URL 稳定，页面结构相对标准；微信搜一搜必须在微信客户端内，CDP 操控复杂度高。

### 去重逻辑

- 扫描 `resources/raw/` 和 `resources/processed/` 目录，从 frontmatter 提取所有已有 `source_url`
- 扫描 `resources/candidates.json`（如存在上次结果）
- 三者取并集作为"已存在"集合，扫描时实时过滤

### 输出

`resources/candidates.json`：

```json
[
  {
    "url": "https://mp.weixin.qq.com/s/xxx",
    "title": "文章标题",
    "excerpt": "摘要前100字",
    "date": "2026-05-01",
    "source": "公众号名称 or 关键词:xxx"
  }
]
```

### CLI

```bash
npx discover scan                      # 扫描全部
npx discover scan --accounts-only      # 仅固定公众号
npx discover scan --keywords-only      # 仅关键词搜索
npx discover scan --max-pages 3        # 限制翻页数
```

## Phase 2: 评估（criteria.ts + evaluator.ts）

### criteria.ts — 总结入选标准

1. 读取 `resources/processed/` 下所有 MD 文件
2. 提取 `tags`、`score_total`、`title`、`summary`、`case_story` 前 300 字
3. 打包发给 LLM，prompt 要求：
   - 总结共同主题方向
   - 提取高频标签和核心标签模式
   - 总结评分分布特征
   - 输出入选标准描述（自然语言，给评估用）
   - 输出搜索关键词建议（10-20 个）
4. 结果缓存到 `resources/criteria.json`
5. 支持 `--refresh-criteria` 强制重新生成

### evaluator.ts — 评估候选文章

1. 读取 `resources/candidates.json` + `resources/criteria.json`
2. 批量评估：每批 10 篇发送给 LLM
3. LLM prompt 结构：
   - System: 入选标准描述 + 评分参考
   - User: 每篇文章的 `{ title, excerpt, date, source }`
   - 输出：`{ url, pass: boolean, reason: string }`
4. 收集 `pass: true` 的 URL
5. 输出 `resources/discovered-urls.txt`（每行一个 URL）

### LLM 模型

复用 article-processor 的 MiniMax M2.7（`https://api.minimaxi.com/anthropic`）。

### CLI

```bash
npx discover evaluate                      # 评估所有候选
npx discover evaluate --top 20             # 输出前 20 篇
npx discover evaluate --refresh-criteria   # 重新总结标准

# 一键运行
npx discover scan && npx discover evaluate
```

## 配置

### config.ts 默认值

```typescript
{
  accounts: string[],           // 公众号名称列表
  keywords: string[],           // 搜索关键词列表
  maxPages: 5,                  // 关键词搜索最大翻页数
  batchSize: 10,                // LLM 评估每批数量
  sogouSearchUrl: "https://weixin.sogou.com",
  outputDir: "resources"
}
```

支持外部 `discover-config.json` 覆盖默认值。

## 边界情况

| 场景 | 处理方式 |
|------|---------|
| 搜狗反爬/验证码 | CDP 检测验证码页面，暂停提示用户手动处理后按回车继续 |
| candidates.json 不存在 | evaluate 报错退出，提示先运行 scan |
| 零篇存量文章 | criteria 跳过，仅用配置关键词搜索，不生成入选标准 |
| 全部候选被过滤 | 输出空 discovered-ursl.txt + 日志提示 |
| LLM API 限流 | 每批之间加 2s 间隔，重试 3 次 |
| 文章 URL 格式异常 | 扫描时过滤非 mp.weixin.qq.com 域名的 URL |

## 与现有管道衔接

```
content-discoverer  →  discovered-urls.txt  →  article-downloader 逐行读取 URL
```

article-downloader 当前接受单 URL 参数。本次不改造 article-downloader，人工从 txt 文件逐行复制 URL 即可。
