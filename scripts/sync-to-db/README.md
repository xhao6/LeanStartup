# Sync-to-DB - 数据同步工具

将处理好的案例数据从 `resources/processed/` 同步到 CloudBase NoSQL Case 集合。

## 目录结构

```
scripts/sync-to-db/
├── lib/
│   ├── parser.js      # MD 文件解析器
│   └── sync.js        # CloudBase 数据同步器
├── prepare.js         # 准备数据（输出 JSON）
├── sync.js           # 同步数据（到云数据库）
├── index.js          # 统一入口
└── README.md         # 本文档
```

## 快速开始

### 1. 准备数据

从 `resources/processed/` 解析 MD 文件，生成验证后的 JSON：

```bash
cd scripts/sync-to-db
node index.js prepare
```

**输出**：`cases-batch.json`（项目根目录）

**功能**：
- 解析所有 MD 文件的 frontmatter 和 sections
- 验证必填字段完整性
- 验证评分数据一致性
- 自动添加时间戳

### 2. 同步到数据库

调用云函数将数据同步到 Case 集合：

```bash
cd scripts/sync-to-db
node index.js sync
```

**功能**：
- 读取 `cases-batch.json` 或直接解析 MD 文件
- 调用 `syncCaseDataPublic` 云函数
- 批量插入/更新案例数据
- 显示同步进度和结果

## 命令行选项

### prepare 命令

```bash
node index.js prepare [选项]
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--input <dir>` | 输入目录 | `../../resources/processed` |
| `--output <file>` | 输出文件 | `../../cases-batch.json` |
| `-h, --help` | 显示帮助 | - |

**示例**：
```bash
# 使用默认配置
node index.js prepare

# 指定输入输出
node index.js prepare --input ./data --output ./cases.json
```

### sync 命令

```bash
node index.js sync [选项]
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--input <dir>` | 输入目录（直接解析 MD） | `../../resources/processed` |
| `--file <path>` | 输入 JSON 文件 | - |
| `--function <name>` | 云函数名称 | `syncCaseDataPublic` |
| `--env <id>` | CloudBase 环境 ID | `CLOUDBASE_ENV_ID` |
| `-h, --help` | 显示帮助 | - |

**示例**：
```bash
# 直接解析 MD 文件并同步
node index.js sync

# 从 JSON 文件同步
node index.js sync --file cases-batch.json

# 指定输入目录
node index.js sync --input ./data

# 指定云函数
node index.js sync --function myCustomSyncFunction
```

## 数据验证

脚本会自动验证以下规则：

### 评分验证
- ✅ 所有评分必须为整数（不允许小数）
- ✅ 总分 = 五维度之和
- ✅ 五维度：feasibility + profit + timeliness + detail + fitness

### 字段验证
必填字段：
- id, title, source_account, source_url, summary
- score_total, score_feasibility, score_profit, score_timeliness, score_detail, score_fitness
- cost, expected_revenue, cycle, steps, tools, pitfalls, suitable_for, risk_tags, status

## 使用场景

### 首次同步

```bash
# 1. 准备数据
node index.js prepare

# 2. 同步到数据库
node index.js sync
```

### 增量更新

添加新文章后，直接运行：
```bash
node index.js sync
```

脚本会自动检测所有 MD 文件并同步。

### 数据修复

当需要修复 Case 集合中的数据时：
```bash
# 1. 修正 MD 文件中的错误
vim resources/processed/100001-xxx/100001-xxx.md

# 2. 重新同步
node index.js sync
```

## 云函数

### syncCaseDataPublic

- **用途**：数据同步云函数
- **SDK**：`@cloudbase/node-sdk`
- **特点**：支持外部脚本调用
- **部署状态**：✅ 已部署

**功能**：
- 接收案例数据数组
- 验证数据完整性
- 查询已存在记录（按 id）
- 新增或更新记录（保留 created_at）

## 环境变量

在 `.env` 文件中配置：

```env
CLOUDBASE_ENV_ID=lean-startup-d2gkuop3af0aed5c0
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key
```

## 故障排查

### 问题：云函数调用失败

```
错误: 此函数仅支持云函数内部调用
```

**原因**：调用了错误的云函数

**解决**：确认使用的是 `syncCaseDataPublic`

---

### 问题：找不到云函数

```
错误: Function not found
```

**解决**：确认 `syncCaseDataPublic` 已部署

**验证方法**：
```bash
npx tcb fn list
```

---

### 问题：评分不一致

```
错误: 评分不一致: score_total=7，五维度之和=6
```

**原因**：MD 文件的 frontmatter 中 total_score 与各维度之和不匹配

**解决**：检查并修正 MD 文件

**示例**：
```yaml
# 错误
total_score: 7
scores:
  feasibility: 2
  revenue: 2
  timeliness: 2
  detail: 1
  userFit: 0  # 和 = 7 ✓

# 错误
total_score: 7
scores:
  feasibility: 2
  revenue: 2
  timeliness: 2
  detail: 1
  userFit: 0.5  # 小数错误

# 正确
total_score: 6
scores:
  feasibility: 2
  revenue: 0
  timeliness: 2
  detail: 1
  userFit: 1  # 和 = 6 ✓
```

---

### 问题：缺少字段

```
案例 100001 缺少字段: cycle, pitfalls
```

**原因**：MD 文件缺少对应的 section

**解决**：检查 MD 文件是否包含以下 section：
- `## 变现周期`
- `## 避坑指南`

---

### 问题：字段提取为空

**现象**：同步后某些字段为空字符串

**原因**：MD 文件中的 section 名称不匹配

**正确的 section 名称**：
- `## 核心亮点`
- `## 操作步骤`
- `## 所需工具`
- `## 启动成本`
- `## 预期收益`
- `## 变现周期`
- `## 适合人群`
- `## 避坑指南`
- `## 风险标签`
- `## 吸睛标签`

## 依赖

```json
{
  "dependencies": {
    "dotenv": "^16.0.0",
    "gray-matter": "^4.0.0",
    "@cloudbase/node-sdk": "^3.1.0"
  }
}
```

## 模块说明

### lib/parser.js

MD 文件解析器，提供以下函数：

- `extractSection(content, sectionName)` - 提取 section 内容
- `parseList(text)` - 解析列表
- `parseCaseFile(filePath)` - 解析单个 MD 文件
- `loadCasesFromDir(dirPath)` - 加载目录下所有案例
- `validateCases(cases)` - 验证数据完整性

### lib/sync.js

CloudBase 数据同步器，提供以下函数：

- `initCloudBase(envId, secretId, secretKey)` - 初始化 CloudBase
- `syncCasesToCloud(app, functionName, cases)` - 同步数据到云数据库

## 相关文档

- **文章下载**：[article-downloader/README.md](../article-downloader/README.md)
- **文章处理**：[article-processor/README.md](../article-processor/README.md)
- **运维指南**：[docs/operations/data-sync.md](../../../docs/operations/data-sync.md)
