# Article Discoverer

公众号文章发现工具：自动扫描搜狗微信搜索并评估候选文章。

## 前置条件

1. Chrome 浏览器已开启远程调试：
   ```bash
   chrome.exe --remote-debugging-port=9222
   ```
2. 环境变量 `MINIMAX_API_KEY` 已配置（在项目根 `.env` 文件中）

## 使用

```bash
cd scripts/article-discoverer

# 扫描公众号 + 关键词
npx tsx src/index.ts scan

# 仅扫描公众号
npx tsx src/index.ts scan --accounts-only

# 仅关键词搜索（限制3页）
npx tsx src/index.ts scan --keywords-only --max-pages 3

# 清除已有候选，重新扫描
npx tsx src/index.ts scan --clean

# 评估候选文章
npx tsx src/index.ts evaluate

# 重新总结入选标准
npx tsx src/index.ts evaluate --refresh-criteria

# 手动模式（从 resources/manual-urls.txt 读取 URL）
npx tsx src/index.ts manual
```

## 输出文件

| 文件 | 说明 |
|------|------|
| `resources/candidates.json` | 候选文章列表（增量更新） |
| `resources/criteria.json` | 入选标准（从存量文章总结） |
| `resources/discovered-urls.txt` | 入选 URL 列表（每行一个） |
| `resources/discovered-metadata.json` | 入选文章评分和理由 |

## 配置

编辑 `src/config.ts` 中的 `accounts` 和 `keywords` 数组。
