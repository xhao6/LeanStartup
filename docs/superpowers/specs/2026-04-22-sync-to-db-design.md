# 数据同步脚本设计

> 将 22 篇 processed 文章同步到 NoSQL Case 集合，同时更新 article-processor 支持新字段。

---

## 背景

- 22 篇文章已通过 `scripts/article-processor/` 处理，输出到 `resources/processed/`
- Case 集合当前 Count=0，需要填充数据
- processed MD 缺少 3 个 Case 必填字段：`cycle`、`risk_tags`、`tags`
- Case 集合缺少 2 个有价值字段：`case_story`（案例故事）、`tags`（吸睛标签）

## 三步走方案

### Step 1: 更新 article-processor

在 `ExtractionResult` 中新增 3 个字段：

```ts
cycle: string        // 变现周期描述，如"1-2周见收益"
riskTags: string[]   // 风险标签，最多3个，如["需保证金","可能违规"]
tags: string[]       // 吸睛标签，恰好5个，每个2-6字
```

改动文件清单：
- `types.ts` — ExtractionResult 加 3 个字段，ScoreReasoning 不变
- `extractor.ts` — prompt 增加提取要求：
  - cycle：从文中提取变现周期描述
  - riskTags：提取风险标签，最多3个
  - tags：**严格规则**：恰好5个，按吸睛程度排序（第一个最抓眼球），每个2-6字，具体有辨识度，禁止泛标签（如"副业"、"赚钱"、"项目"）
- `reviewer.ts` — 校验 tags 恰好 5 个、每个 2-6 字；riskTags 最多 3 个
- `formatter.ts` — MD 输出增加 3 个 section：变现周期、风险标签、吸睛标签

### Step 2: 手动补全 22 篇现有 processed MD

在每篇 MD 中手动添加三个 section，格式：

```markdown
## 变现周期
1-2周见收益

## 风险标签
- 需保证金
- 可能违规

## 吸睛标签
- API被动收入
- 程序员副业
- 零成本启动
- 数字产品
- 睡后收入
```

### Step 3: sync-to-db 脚本

`scripts/sync-to-db/index.ts`，TypeScript 本地脚本。

#### 字段映射

| MD 来源 | Case 集合字段 | 转换逻辑 |
|---------|--------------|---------|
| frontmatter.id | id | 直传 |
| frontmatter.source_title | title | 直传 |
| frontmatter.source_author | source_account | 直传 |
| frontmatter.source_url | source_url | 直传 |
| section 核心亮点 | summary | 直传（≤200字） |
| section 案例故事 | case_story | 直传 |
| frontmatter.total_score | score_total | 直传 |
| frontmatter.scores.feasibility | score_feasibility | 直传 |
| frontmatter.scores.revenue | score_profit | 重命名 |
| frontmatter.scores.timeliness | score_timeliness | 直传 |
| frontmatter.scores.detail | score_detail | 直传 |
| frontmatter.scores.userFit | score_fitness | 重命名 |
| section 启动成本 | cost | 直传 |
| section 预期收益 | expected_revenue | 直传 |
| section 变现周期 | cycle | 直传 |
| section 操作步骤 | steps | 文本 → `[{step: string, order: number}]` |
| section 所需工具 | tools | 文本 → `[{name: string, desc: string}]` |
| section 避坑指南 | pitfalls | 直传 |
| section 适合人群 | suitable_for | 直传 |
| section 风险标签 | risk_tags | 列表 → `string[]` |
| section 吸睛标签 | tags | 列表 → `string[]` |
| — | status | 固定 `"published"` |
| — | is_classic | 固定 `false` |

#### steps 解析规则

输入文本（从 MD section 提取）：
```
1. 选择一个有需求的细分领域
2. 编写解决具体问题的API
3. 设计简洁的接口
```

输出：
```json
[{"step": "选择一个有需求的细分领域", "order": 1}, {"step": "编写解决具体问题的API", "order": 2}, {"step": "设计简洁的接口", "order": 3}]
```

正则：`/^\d+\.\s*(.+)/` 逐行匹配。

#### tools 解析规则

输入文本：
```
- Stripe（支付收款平台，用于接收客户付款）
- Rapid API（API市场平台）
```

输出：
```json
[{"name": "Stripe", "desc": "支付收款平台，用于接收客户付款"}, {"name": "Rapid API", "desc": "API市场平台"}]
```

正则：`/^-\s*(.+?)[（(](.+?)[)）]$/` 捕获 name 和 desc。无括号时 desc 为空字符串。

#### 列表字段解析规则（risk_tags, tags）

输入：
```
- 需保证金
- 可能违规
```

输出：`["需保证金", "可能违规"]`

正则：`/^-\s*(.+)/` 逐行匹配。

#### 调用方式

通过 MCP `manageFunctions(action=invokeFunction)` 调用 syncCaseData 云函数，传入 `{cases: [...]}`。

syncCaseData 需要同步更新以接受 `case_story` 和 `tags` 两个字段：
- `REQUIRED_FIELDS` 中不加这两个（非必填）
- `buildRecord` 中加入 `case_story` 和 `tags` 字段

#### 执行流程

1. 扫描 `resources/processed/` 所有子目录
2. 对每个目录读取 MD 文件
3. 解析 frontmatter（gray-matter）+ body sections
4. 构建符合 syncCaseData 输入格式的 JSON
5. 批量调用 syncCaseData（每批最多 10 条）
6. 输出统计：成功/失败/跳过数量

#### CLI 接口

```bash
npx tsx src/index.ts                          # 同步所有
npx tsx src/index.ts --id 100001 100002        # 同步指定 ID
npx tsx src/index.ts --dry-run                 # 仅输出 JSON，不写入
```

## Case 集合字段变更

新增 2 个字段（非必填）：

| 字段 | 类型 | 说明 |
|------|------|------|
| case_story | string | 案例故事，300-800字叙述 |
| tags | string[] | 吸睛标签，恰好5个，每个2-6字 |

## syncCaseData 云函数变更

- `buildRecord()` 中加入 `case_story` 和 `tags` 字段
- 不加入 `REQUIRED_FIELDS`（这两个字段允许为空）
