# Scripts 目录

内容管道相关脚本目录，包含文章下载和文章处理工具。

## 目录结构

```
scripts/
├── article-downloader/    # 文章下载工具
│   └── README.md
└── article-processor/     # 文章处理工具
    └── README.md
```

## 子模块说明

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

## 数据流程

```
┌─────────────────────────────────────────────────────────────┐
│                     内容采集流程                               │
└─────────────────────────────────────────────────────────────┘

    运营筛选               article-downloader              article-processor
  文章 URL      ──────►  下载 HTML 文件      ──────►  LLM 评分 + 结构化
                          ↓                         ↓
                   resources/raw/          resources/processed/
                                               ↓
                                         sync-cases.js (根目录)
                                               ↓
                                         Case 集合 (NoSQL 数据库)
```

## 相关文档

- **数据同步脚本**：项目根目录的 `sync-cases.js` 和 `prepare-cases.js`
- **运维指南**：`docs/operations/` 目录
