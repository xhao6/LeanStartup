# XHS Copywriter 自动化集成设计

## 概述

在 `scripts/reporter` 中添加独立 CLI 命令，生成每日海报时同步输出小红书笔记文案。使用 xhs-copywriter-redfox 的数据链路（Python 脚本获取真实爆款数据）加 MiniMax AI 生成文案。

## 架构

```
scripts/reporter/src/
├── index.ts              (不动)
├── copywriter.ts         ★ 新增 - CLI 入口
│   └─ daily [date]
└── lib/
    └── copywriter.ts     ★ 新增 - 文案生成逻辑
```

### copywriter.ts (CLI 入口)

```typescript
// 用法
npx tsx src/copywriter.ts daily          // 今天
npx tsx src/copywriter.ts daily 2026-06-01  // 指定日期
```

功能：
- 参数解析（date）
- 调用 `generateXhsCopy(date)`  
- 打印结果路径

### lib/copywriter.ts (核心逻辑)

#### 函数: `generateXhsCopy(date: string): Promise<string>`

返回输出文件路径。

**步骤：**

1. **读取案例数据**
   - 复用 `fetchDailyPick(db, date)` → 获取当日 `case_ids`
   - 复用 `fetchCasesByIds(db, case_ids)` → 获取 3 个案例
   - 从 tag 字段提取高频关键词（最多5个，逗号分隔）

2. **调用 Python 脚本获取小红书爆款数据**
   - 子进程执行：`python3 <skill_path>/scripts/fetch_xhs_trends.py --keyword "<tags>" --max-items 8 --output-format json`
   - 脚本路径：`scripts/reporter/../../skills/xhs-copywriter-redfox/scripts/fetch_xhs_trends.py`
   - 解析 JSON 返回的爆款数据

3. **联网搜索最新热点**
   - `web_search` 获取该领域最新动态

4. **调用 MiniMax 生成文案**
   - 复用 article-processor 的 Anthropic 兼容模式
   - System Prompt：基于 xhs-copywriter-redfox 的 SKILL.md + core_workflow.md 的规则
   - User Message：案例数据 + 爆款数据 + 热点信息

5. **输出文件**
   - 路径：`output/{date}/xhs-copy.txt`
   - 纯文本 UTF-8，无 Markdown
   - 格式如下

## 输出格式

```text
推荐标题

1. [标题1]
2. [标题2]
...

正文内容

[正文]


推荐标签

#标签1 #标签2 ...


爆款公式来源

参考的爆款规律：[规律简述]
参考的爆款笔记
1. [标题] - [作者] - 收藏X 点赞X
...
```

约束：
- 纯文本，无任何 Markdown 语法
- 不包含投入、周期、收入信息
- 标签带 # 前缀，空格分隔

## System Prompt 设计

基于 xhs-copywriter-redfox 的 core_workflow.md 中的规则翻译，包含：

1. **角色定位**：小红书爆款文案写手
2. **标题规则**：数字型/情绪型/疑问型，不超过20字，参考爆款数据中的标题结构
3. **正文规则**：开头钩子（痛点共鸣/惊人数据/反差对比）+ 分点干货 + 互动收尾，融入高频关键词
4. **格式约束**：纯文本，无Markdown，标签带#，不包含投入/周期/收入
5. **自检清单**：确保标题6个、正文完整、标签5-10个、爆款公式来源完整
6. **爆款数据引用**：基于 Python 脚本返回的真实趋势数据进行分析和参考

## 关键词生成

从 3 个案例的 `tags` 字段取交集或高频标签，最多 5 个，逗号分隔，不超过 200 字符。

fallback：若 tags 不足，从 `title` 字段提取关键词。

## MiniMax 调用模式

复用 article-processor 的模式：

```typescript
import Anthropic from "@anthropic-ai/sdk"
const client = new Anthropic({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: "https://api.minimaxi.com/anthropic",
})
const res = await client.messages.create({
  model: "MiniMax-M2.7",
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: prompt }],
})
```

## 依赖变更

在 `scripts/reporter/package.json` 中添加：
- `@anthropic-ai/sdk`（版本同 article-processor 使用的一致）

## 错误处理

- Python 脚本调用失败：警告但不中断，使用纯 AI 生成（仅基于案例数据+热点）
- MiniMax 调用失败：抛出错误，提示重试
- 当天无数据：抛出错误，沿用现有报告的错误处理模式

## 文件

- `scripts/reporter/src/copywriter.ts` — CLI 入口（~30行）
- `scripts/reporter/src/lib/copywriter.ts` — 核心逻辑（~120行）
