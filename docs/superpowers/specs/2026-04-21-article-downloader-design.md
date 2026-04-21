# Article Downloader 独立脚本设计

## 背景

精益副业案例库项目需要批量下载公众号文章，当前依赖 baoyu-url-to-markdown skill，输出路径和命名不规范。需要一个独立的、可自定义的下载脚本。

## 方案选择

**方案 B：独立脚本**，从原 skill 提取核心 CDP 捕获 + Markdown 转换 + 媒体下载逻辑，放入项目 `scripts/article-downloader/` 下。

选择理由：完全自包含，可自由改造编号逻辑和输出结构，不依赖插件目录。

## 目录结构

```
scripts/article-downloader/
  index.ts              # 入口，CLI 解析，编排多 URL
  capture.ts            # Chrome CDP 捕获逻辑
  convert.ts            # HTML → Markdown 转换（Defuddle + Legacy 双路径）
  media.ts              # 图片/视频下载 + Markdown 路径替换
  naming.ts             # 编号管理、目录名生成
  cdp.ts                # CDP 连接、页面控制、滚动等底层能力
  constants.ts          # 超时、端口等常量
  package.json
```

## 输出目录结构

```
resources/raw/
  100001-260421-年轻人不愿干的后厨炸鸡岗/
    article.md          # Markdown（含 YAML frontmatter）
    captured.html       # HTML 快照
    imgs/               # 本地化图片
  100002-260422-用AI做小红书月入5万/
    article.md
    captured.html
    imgs/
```

规则：
- Markdown 统一命名为 `article.md`
- 编号：6 位数字，从 100001 起自动递增
- 日期：YYMMDD 格式，取当天日期
- 标题：从页面 HTML 的 `<title>` 或 `og:title` 自动提取
- 图片：默认下载到 `imgs/`，Markdown 链接替换为本地相对路径

## CLI 接口

```bash
bun scripts/article-downloader/index.ts <url1> <url2> ... [options]
```

| 参数 | 说明 |
|------|------|
| `<url> ...` | 一个或多个文章 URL（必填） |
| `--wait` | 等待用户确认后再捕获（用于需登录页面） |
| `--timeout <ms>` | 页面加载超时（默认 30000） |
| `--no-media` | 不下载图片（默认下载） |
| `--no-html` | 不保存 HTML 快照（默认保存） |
| `--output-dir <dir>` | 覆盖默认输出目录（默认 `resources/raw/`） |

## 核心流程（每个 URL）

1. **Chrome CDP 启动** → 打开 URL
2. **等待页面加载** + 网络空闲 + 滚动触发懒加载
3. **提取完整 DOM HTML** → 保存 `captured.html`
4. **HTML → Markdown 转换**（Defuddle 优先，Legacy 兜底）
5. **下载图片**到 `imgs/`，替换 Markdown 中的链接
6. **生成编号**，创建目录，保存 `article.md`
7. **输出结果摘要**

## 编号管理

- 扫描 `resources/raw/` 下所有以 6 位数字开头的目录名
- 取最大编号 + 1 作为下一个编号
- 目录为空（首次运行）时从 100001 开始
- 同一批次内的多个 URL 按顺序递增编号

## 错误处理

- 单个 URL 失败不影响其他 URL，跳过并报告错误
- 所有 URL 处理完毕后输出汇总：成功 N 篇，失败 M 篇（含原因）

## 保留的原 skill 功能

| 功能 | 实现 |
|------|------|
| Chrome CDP 渲染 | 从 `cdp.ts` 提取 |
| Defuddle + Legacy 双转换 | 从 `html-to-markdown.ts` 等提取 |
| 图片下载 + 路径替换 | 从 `media-localizer.ts` 提取 |
| `--wait` 模式 | 保留，用于需要登录的页面 |
| HTML 快照保存 | 保留，保存为 `captured.html` |
