# Scripts 目录

内容管道相关脚本目录，包含文章下载、文章处理和数据同步工具。

## 目录结构

```
scripts/
├── article-discoverer/    # 文章发现工具
│   ├── src/
│   │   ├── index.ts      # CLI 入口
│   │   ├── scanner.ts    # 搜狗微信搜索扫描
│   │   ├── evaluator.ts  # LLM 评估筛选
│   │   └── ...           # 其他模块
│   └── README.md
├── article-downloader/    # 文章下载工具
│   └── README.md
├── article-processor/     # 文章处理工具
│   └── README.md
└── sync-to-db/           # 数据同步工具
    ├── lib/
    │   ├── parser.js     # MD 文件解析器
    │   └── sync.js       # CloudBase 数据同步器
    ├── prepare.js        # 准备数据（输出 JSON）
    ├── sync.js          # 同步数据（到云数据库）
    └── README.md
```

## 子模块说明

### article-discoverer - 文章发现工具

通过搜狗微信搜索自动扫描公众号和关键词，收集候选文章并用 LLM 评估筛选。

**主要功能**：
- 扫描指定公众号的最新文章列表
- 按关键词搜索微信文章（支持多页翻页）
- 自动处理验证码（等待手动解决）
- 用 LLM 评估文章是否符合入选标准
- 支持手动模式（直接提供 URL 列表）

**快速开始**：
```bash
# 1. 启动 Chrome（带远程调试）
chrome.exe --remote-debugging-port=9222

# 2. 运行扫描
cd scripts/article-discoverer
npx tsx src/index.ts scan

# 3. 评估候选文章
npx tsx src/index.ts evaluate
```

**详细文档**：[article-discoverer/README.md](article-discoverer/README.md)

---

### article-downloader - 文章下载工具

使用 Chrome CDP (Chrome DevTools Protocol) 从微信公众号下载文章内容。

**主要功能**：
- 通过远程调试端口连接 Chrome 浏览器
- 自动滚动加载完整文章内容
- 提取文章标题和正文
- 保存为 HTML 文件到 `resources/raw/`

**快速开始**：
```bash
# 1. 启动 Chrome（带远程调试）
chrome.exe --remote-debugging-port=9222

# 2. 运行下载脚本
cd scripts/article-downloader
node download.js "https://mp.weixin.qq.com/s/xxxxx"
```

**详细文档**：[article-downloader/README.md](article-downloader/README.md)

---

### article-processor - 文章处理工具

使用 LLM (MiniMax AI) 对下载的文章进行智能评分和结构化提取。

**主要功能**：
- AI 评分（5 个维度：可行性、收益、时效性、细节、适配度）
- 提取关键信息（摘要、步骤、工具、成本、风险等）
- 自动脱敏处理（手机号、微信号、身份证等）
- 生成结构化 Markdown 文件

**快速开始**：
```bash
cd scripts/article-processor
node process.js 1700000001
```

**详细文档**：[article-processor/README.md](article-processor/README.md)

---

### sync-to-db - 数据同步工具

将处理好的案例数据从 `resources/processed/` 同步到 CloudBase NoSQL Case 集合。

**主要功能**：
- 解析 Markdown 文件（frontmatter + sections）
- 验证数据完整性（评分、必填字段）
- 调用云函数批量同步到数据库
- 支持命令行参数配置

**快速开始**：
```bash
# 同步数据（直接解析 MD 文件）
cd scripts/sync-to-db
node index.js sync

# 或分步操作
node index.js prepare  # 生成 cases-batch.json
node index.js sync --file ../../cases-batch.json
```

**详细文档**：[sync-to-db/README.md](sync-to-db/README.md)

## 数据流程

```
┌─────────────────────────────────────────────────────────────┐
│                     内容采集流程                               │
└─────────────────────────────────────────────────────────────┘

  article-discoverer        运营确认             article-downloader
  扫描 + LLM 筛选       ──────►  审核 URL   ──────►  下载 HTML 文件
        ↓                                        ↓
  resources/candidates.json                 resources/raw/
  resources/discovered-urls.txt
                                                    ↓
                                            article-processor
                                          LLM 评分 + 结构化
                                                    ↓
                                          resources/processed/
                                                    ↓
                                              sync-to-db
                                                    ↓
                                          Case 集合 (NoSQL 数据库)
```

## 相关文档

- **运维指南**：[docs/operations/](../docs/operations/)
  - [data-sync.md](../docs/operations/data-sync.md) - 数据同步详细指南
  - [delete-syncCaseData.md](../docs/operations/delete-syncCaseData.md) - 云函数清理记录
