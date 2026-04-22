# Article Processor

文章处理工具，使用 LLM (MiniMax AI) 对下载的文章进行评分和结构化提取。

## 功能

- 调用 MiniMax AI API 对文章进行智能评分
- 提取关键信息：摘要、操作步骤、所需工具、成本收益等
- 生成结构化的 Markdown 文件
- 自动脱敏处理（手机号、微信号、身份证等）

## 使用方法

### 1. 配置环境变量

确保 `.env` 文件包含：
```
MINIMAX_API_KEY=your_api_key
MINIMAX_GROUP_ID=your_group_id
```

### 2. 运行处理脚本

```bash
cd scripts/article-processor
node process.js <文章编号>
```

### 示例

```bash
# 处理单篇文章
node process.js 1700000001

# 批量处理（使用循环）
for id in 1700000001 1700000002 1700000003; do
  node process.js $id
done
```

### 输出

文件保存到：`resources/processed/<编号>/<编号>.md`

## 输出格式

生成的 Markdown 文件包含以下 frontmatter：

```yaml
---
id: "100001"
source_title: "文章标题"
source_url: "原文链接"
source_author: "公众号名称"
processed_at: "处理时间"
total_score: 7
scores:
  feasibility: 2    # 落地可行性 (0-3)
  revenue: 2         # 收益潜力 (0-2)
  timeliness: 2      # 时效性 (0-2)
  detail: 1          # 实操细节 (0-2)
  userFit: 0         # 用户适配度 (0-1)
---
```

### 正文结构

- **案例故事**：原文内容
- **核心亮点**：一句话摘要
- **操作步骤**：具体执行步骤
- **所需工具**：用到的工具/资源
- **启动成本**：需要的投入
- **预期收益**：预计收入
- **变现周期**：多长时间见效
- **适合人群**：目标用户
- **避坑指南**：风险提示
- **风险标签**：风险分类
- **吸睛标签**：分类标签

## 评分标准

| 维度 | 分值范围 | 说明 |
|------|---------|------|
| 落地可行性 | 0-3 | 普通人能否执行 |
| 收益潜力 | 0-2 | 收入规模上限 |
| 时效性 | 0-2 | 是否有时效性要求 |
| 实操细节 | 0-2 | 步骤是否详细 |
| 用户适配度 | 0-1 | 是否适合新手 |

**注意**：所有评分必须为整数，总分 = 五维度之和

## 脱敏规则

自动过滤以下敏感信息：
- 手机号码：`1[3-9]\d{9}`
- 微信号：`微信号: xxx`
- 身份证号：`\d{17}[\dXx]`
- 电子邮箱：`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`

## 依赖

- dotenv - 环境变量管理
- axios - HTTP 请求
- gray-matter - Markdown frontmatter 解析

## MiniMax API 配置

- **模型**: minimax-2.7
- **温度**: 0.7
- **最大 tokens**: 4000

## 成本估算

- 约 2000 token/篇
- 约 0.01 元/篇
- 每周处理 20-30 篇，成本约 0.2-0.3 元

## 故障排查

### 问题：API 调用失败
```
Error: MiniMax API request failed
```
**解决**：
1. 检查 `.env` 文件中的 API Key 是否正确
2. 确认 MiniMax 账户余额充足
3. 检查网络连接

### 问题：评分是小数
```
评分必须为整数，当前值: 2.5
```
**解决**：这是 LLM 输出问题，需要手动修正 MD 文件中的评分为整数

### 问题：JSON 解析失败
**解决**：重新运行脚本，偶尔 LLM 会输出非标准 JSON

## 数据质量检查

运行以下命令检查所有已处理文章：

```bash
cd scripts/article-processor
node check.js
```

会检查：
- 评分是否为整数
- 总分是否等于五维度之和
- 必填字段是否完整
