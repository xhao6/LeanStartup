# 数据同步指南

用于将处理好的案例数据从 `resources/processed/` 同步到 CloudBase NoSQL Case 集合。

## 脚本位置

这两个脚本位于项目根目录：
- `prepare-cases.js` - 数据准备脚本
- `sync-cases.js` - 数据同步脚本

## 快速开始

### 1. 准备数据

从 `resources/processed/` 解析 MD 文件，生成验证后的 JSON：

```bash
node prepare-cases.js
```

**输出**：`cases-batch.json`

**功能**：
- 解析所有 MD 文件的 frontmatter 和 sections
- 验证必填字段完整性
- 验证评分数据一致性
- 自动添加时间戳

### 2. 同步到数据库

调用云函数将数据同步到 Case 集合：

```bash
node sync-cases.js
```

**功能**：
- 读取 `cases-batch.json` 或直接解析 MD 文件
- 调用 `syncCaseDataPublic` 云函数
- 批量插入/更新案例数据
- 显示同步进度和结果

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
node prepare-cases.js

# 2. 同步到数据库
node sync-cases.js
```

### 增量更新

添加新文章后，直接运行：

```bash
node sync-cases.js
```

脚本会自动检测所有 MD 文件并同步。

### 数据修复

当需要修复 Case 集合中的数据时：

```bash
# 1. 修正 MD 文件中的错误
vim resources/processed/100001-xxx/100001-xxx.md

# 2. 重新同步
node sync-cases.js
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

## 相关文档

- **文章下载**：[scripts/article-downloader/README.md](../scripts/article-downloader/README.md)
- **文章处理**：[scripts/article-processor/README.md](../scripts/article-processor/README.md)
- **云函数清理**：[docs/operations/delete-syncCaseData.md](../../docs/operations/delete-syncCaseData.md)
