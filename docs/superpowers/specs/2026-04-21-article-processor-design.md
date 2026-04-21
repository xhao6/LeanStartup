# Article Processor 设计文档

## 概述

本地脚本，处理 `resources/raw/` 下的原始公众号文章，使用 MiniMax-M2.7 LLM 完成结构化提取、5维打分、质量审核，输出严格PRD格式的结构化MD到 `resources/processed/`。

## 输入输出

**输入：** `resources/raw/<NNNNNN-YYMMDD-标题>/article.md`（未标记 `processed_at` 的文章）
**输出：** `resources/processed/<NNNNNN>.md`（结构化MD）
**副作用：** 原文 frontmatter 添加 `processed_at` 时间戳

## 技术选型

- **语言：** TypeScript (Node.js)
- **LLM：** MiniMax-M2.7，通过 Anthropic SDK 兼容接口调用
  - base_url: `https://api.minimaxi.com/anthropic`
  - model: `MiniMax-M2.7`
- **包管理：** uv（遵循项目约定）
- **依赖：** `@anthropic-ai/sdk`，`yaml`（frontmatter解析），`gray-matter`（frontmatter读写）

## 处理流程

```
扫描raw目录 → 跳过已处理 → 读取原文 → LLM提取+打分 → LLM审核纠错 → 格式化MD → 写入processed → 标记原文
```

### 第1次LLM调用：提取+打分

输入原文全文，要求返回JSON：

```json
{
  "sourceTitle": "原文标题（从原文中提取的原始标题）",
  "coreHighlight": "核心亮点（1-3句概括案例核心价值）",
  "steps": ["步骤1", "步骤2", "..."],
  "tools": ["工具1", "工具2"],
  "startupCost": "启动成本描述（含具体金额或范围）",
  "expectedRevenue": "预期收益描述（含具体金额或范围）",
  "targetAudience": "适合人群描述",
  "pitfalls": ["避坑点1", "避坑点2"],
  "score": {
    "feasibility": 0,
    "revenue": 0,
    "timeliness": 0,
    "detail": 0,
    "userFit": 0
  },
  "scoreReasoning": {
    "feasibility": "打分理由",
    "revenue": "打分理由",
    "timeliness": "打分理由",
    "detail": "打分理由",
    "userFit": "打分理由"
  },
  "caseStory": "案例故事（300-800字，用叙事手法详述文章中的案例故事，开头用一个吸引读者的钩子切入，去除所有广告/拉群/关注内容，保留关键数据和转折点）"
}
```

**提示词核心要求：**
- 去除广告/拉群/关注/求转发等无关内容
- 仅从原文提取信息，不编造
- 7大字段按PRD定义提取
- 打分严格按PRD权重：落地可行性(0-3)、收益潜力(0-2)、时效性(0-2)、实操细节(0-2)、用户适配度(0-1)
- 如果原文信息不足，对应字段标注"原文未提及"，对应维度给低分

### 第2次LLM调用：审核纠错

输入：原文 + 第1次JSON输出

**审核维度：**
1. 字段完整性：7大字段是否都有实质内容（非"原文未提及"）
2. 案例故事质量：是否有钩子、字数是否在300-800范围、是否去除了广告内容、关键数据和转折点是否保留
3. 打分合理性：分数是否与原文内容匹配
4. 事实性校验：金额、数字、工具名、平台名是否准确提取
5. 步骤完整性：操作步骤是否有明显遗漏
6. 广告残留：是否还有广告/拉群/关注内容残留

**输出：** 修正后的JSON（含 `reviewNotes` 字段记录修改点）或确认通过

### 打分维度定义

| 维度 | 满分 | 评判标准 |
|------|------|---------|
| 落地可行性 | 3 | 操作难度（低=高分）、启动成本（≤500元加分）、是否需要专业技能（不需要=高分） |
| 收益潜力 | 2 | 收益稳定性、变现周期（≤7天加分）、收益上限 |
| 时效性 | 2 | 适配当前市场环境、是否有可持续性、当下热门方向加分 |
| 实操细节 | 2 | 操作步骤完整性、避坑提示清晰度、工具可获取性 |
| 用户适配度 | 1 | 是否适合普通用户（无需专业资质、无需大量时间） |

## 输出格式

文件路径：`resources/processed/<NNNNNN>.md`

```markdown
---
id: "100001"
source_title: "原始标题"
source_url: "https://mp.weixin.qq.com/s/..."
source_author: "作者"
processed_at: "2026-04-21T22:18:22.221Z"
total_score: 7.5
scores:
  feasibility: 2.5
  revenue: 1.5
  timeliness: 1.5
  detail: 1.5
  userFit: 0.5
---

## 案例故事

300-800字的案例故事，开头有吸引读者的钩子...

## 核心亮点

核心亮点内容...

## 操作步骤

1. 步骤1
2. 步骤2

## 所需工具

- 工具1
- 工具2

## 启动成本

成本描述

## 预期收益

收益描述

## 适合人群

人群描述

## 避坑指南

- 避坑点1
- 避坑点2
```

## 标记原文章

在 `resources/raw/<dir>/article.md` 的frontmatter中添加字段：
```yaml
processed_at: "2026-04-21T22:18:22.221Z"
```

使用 gray-matter 库读取并更新frontmatter，保持原文内容不变。

## 文件结构

```
scripts/article-processor/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # CLI入口：扫描未处理文章、批量处理
    ├── extractor.ts      # 第1次LLM调用：清洗+提取+打分
    ├── reviewer.ts       # 第2次LLM调用：审核纠错
    ├── formatter.ts      # JSON → 结构化MD格式化输出
    ├── scorer.ts         # 打分维度定义、校验、总分计算
    └── types.ts          # TypeScript类型定义
```

## CLI接口

```bash
# 处理所有未处理文章
uv run article-processor

# 处理指定文章（按ID）
uv run article-processor --id 100001 100002

# 只提取不打分（调试用）
uv run article-processor --extract-only

# 跳过审核步骤
uv run article-processor --skip-review

# 指定输出目录（默认 resources/processed）
uv run article-processor --output-dir resources/processed

# 指定raw目录（默认 resources/raw）
uv run article-processor --raw-dir resources/raw
```

## 错误处理

- LLM调用失败：记录错误，跳过该文章，继续处理下一篇
- JSON解析失败：重试1次（LLM有时输出格式不规范），仍失败则跳过
- 原文frontmatter缺少必要字段（url/title）：打印警告，用目录名中的信息兜底
- 文件写入失败：终止并报错（磁盘空间等）

## 批量处理逻辑

1. 扫描 `resources/raw/` 下所有匹配 `NNNNNN-*` 格式的目录
2. 读取每个目录下的 `article.md`
3. 检查 frontmatter 中是否有 `processed_at` 字段，有则跳过
4. 按 `--id` 参数过滤（如果指定了）
5. 按ID升序处理
6. 每处理完一篇，立即写入输出和标记（避免中途失败丢失进度）
7. 最后打印处理摘要：成功N篇，失败M篇，跳过K篇
