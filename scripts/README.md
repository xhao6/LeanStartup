# 数据同步脚本

用于将处理好的案例数据同步到 CloudBase NoSQL 数据库。

## 脚本说明

### prepare-cases.js
从 `resources/processed/` 目录解析 MD 文件，生成批量 JSON 数据。

**使用方法**：
```bash
node prepare-cases.js
```

**输出**：`cases-batch.json`

**功能**：
- 解析所有 MD 文件的 frontmatter
- 提取各个 section（案例故事、操作步骤、避坑指南等）
- 验证必填字段
- 添加时间戳

### sync-cases.js
调用云函数将数据同步到 Case 集合。

**使用方法**：
```bash
node sync-cases.js
```

**功能**：
- 读取 `cases-batch.json` 或解析 MD 文件
- 调用 `syncCaseDataPublic` 云函数
- 批量插入/更新案例数据
- 显示同步进度和结果

## 云函数说明

### syncCaseDataPublic
- **用途**：数据同步云函数
- **特点**：使用 `@cloudbase/node-sdk`，支持外部脚本调用
- **场景**：批量导入、数据修复、运维脚本

**注意**：原 `syncCaseData` 云函数已弃用并删除（2026-04-22）

## 使用流程

### 首次同步
```bash
# 1. 准备数据
node prepare-cases.js

# 2. 同步到数据库
node sync-cases.js
```

### 增量更新
如果添加了新文章，直接运行：
```bash
node sync-cases.js
```

脚本会自动检测所有 MD 文件并同步。

## 数据验证

脚本会自动验证：
- ✅ 评分必须为整数
- ✅ 总分 = 五维度之和
- ✅ 必填字段完整

## 依赖

- `dotenv` - 环境变量
- `gray-matter` - Markdown 解析
- `@cloudbase/node-sdk` - CloudBase SDK

## 环境变量

在 `.env` 文件中配置：
```
CLOUDBASE_ENV_ID=your-env-id
CLOUDBASE_SECRET_ID=your-secret-id
CLOUDBASE_SECRET_KEY=your-secret-key
```

## 故障排查

### 问题：云函数调用失败
```
错误: 此函数仅支持云函数内部调用
```
**解决**：确认使用的是 `syncCaseDataPublic`

### 问题：找不到云函数
```
错误: Function not found
```
**解决**：确认云函数 `syncCaseDataPublic` 已部署

### 问题：评分不一致
```
评分不一致: score_total=7，五维度之和=6
```
**解决**：检查 MD 文件的 frontmatter，修正 total_score 或各维度评分

### 问题：缺少字段
```
案例 xxx 缺少字段: cycle, pitfalls
```
**解决**：检查 MD 文件是否缺少对应的 section
