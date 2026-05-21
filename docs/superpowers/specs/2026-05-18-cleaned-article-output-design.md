# Cleaned Article Output — Design Doc

## 目标

在 article-processor 处理过程中，额外生成一份 LLM 清理后的纯 Markdown 原文，图片以内联 base64 嵌入，保存到 `resources/processed/<id>/` 目录。

## 产出文件格式

- **路径**: `resources/processed/<dirName>/<AITitle>-<id>.md`
- **示例**: `resources/processed/100045-260519-xxx/NotebookLM做小红书课件-100045.md`
- **frontmatter**: 无，纯正文 Markdown
- **图片**: `data:image/xxx;base64,...` 内联嵌入，无外部引用

## 流程

在 `processArticle()` 中，当前流水线为：

```
extractArticle → reviewExtraction → formatProcessedMarkdown → markAsProcessed
```

在 `formatProcessedMarkdown` 之后新增一步：

```
formatProcessedMarkdown → writeCleanedArticle → markAsProcessed
```

### writeCleanedArticle 步骤

入参：
- `article: RawArticle` — 包含原始 markdown 内容（`article.content`）和目录路径
- `rawDir: string` — `resources/raw` 的绝对路径

执行：

#### 1. LLM 清理原文

调用 MiniMax（与现有 extractor/reviewer 共用 client），prompt 要求：

- 去除公众号运营元素（关注引导、点赞在看、原文链接、作者简介）
- 去除广告推广/外链
- 去除与正文无关的冗余段落
- 美化 Markdown 格式（规范标题层级、统一空行、修正换行）
- 生成一个 ≤20 字的短标题（用于文件名）
- 输出 JSON: `{ "title": "短标题", "content": "清理后的完整markdown正文" }`

输入数据：`article.content`（不含 frontmatter 的纯正文）

#### 2. Base64 图片嵌入

扫描 LLM 返回的 `content`，找出所有 `![](...)` 引用：

- 相对路径如 `imgs/img-002-640.webp` → 拼接 `rawDir/<article.dirName>/` 得到绝对路径
- 读取文件 → `fs.readFileSync()`
- 根据扩展名推断 MIME（`.webp`→`image/webp`, `.png`→`image/png`, `.jpg`→`image/jpeg` 等）
- 替换为 `![](data:image/xxx;base64,<base64数据>)`
- 封面图（coverImage）在 frontmatter 中，已在第1步被清理，无需处理

#### 3. 写出文件

- 文件名: `<AITitle>-<article.id>.md`
- 路径: `path.join(options.outputDir, article.dirName, fileName)`
- 内容是纯 markdown 正文（无 frontmatter）

## LLM 调用设计

- **模型**: MiniMax-M2.7（与现有 extractor/reviewer 一致）
- **max_tokens**: 4096（文章最长约 3000 token，加上图片替换后足够）
- **温度**: 0.3（偏低以确保结构稳定，不要创意改写）
- **预期耗时**: 15-30s/篇
- **预期成本**: ~0.01 元/篇

### System Prompt

```
你是一位公众号文章清理专家。你的任务是对一篇从微信公众号下载的 Markdown 文章进行清理和美化。

## 清理规则
1. 删除所有公众号运营元素：关注引导（如"点击上方 XX 关注"）、点赞在看、原文链接、作者简介
2. 删除所有广告推广和外链（与正文无关的链接）
3. 删除冗余的段落引导语（如"大家好，我是XX"之类与正文无关的开场白）
4. 保留正文的核心内容、案例故事、操作步骤、数据等实质性信息

## 美化规则
1. 规范 Markdown 标题层级（使用 # 作为顶级标题）
2. 统一空行（段落之间一个空行，标题前后各一个空行）
3. 修正多余或缺失的换行
4. 保持原文的图片引用不变（不要删除或修改图片标签）

## 输出格式
输出 JSON，不要其他内容：
{
  "title": "不超过20个字的短标题，概括文章核心内容",
  "content": "清理和美化后的完整 Markdown 正文"
}
```

## 文件命名冲突处理

如果同一目录下已存在同名文件（重复运行），直接覆盖。

## 依赖

- `@anthropic-ai/sdk`（已有）
- 无新增依赖

## 执行模式

### 模式1：默认流程（process 时自动执行）

`processArticle()` 在 `formatProcessedMarkdown` 之后自动调用 `writeCleanedArticle()`。

对 `--skip-review` 和 `--extract-only` 模式同样生效（只要 extraction 完成就会执行清理）。

无需新增命令行选项。

### 模式2：后补模式（clean-only）

新增 CLI 选项 `--clean-only`，用于对已处理过的案例**只执行清理步骤**，不重复 extraction/review。

`scanUnprocessed()` 默认只扫描 `processed_at` 为空的文章。clean-only 模式下反转逻辑：

- 扫描 `raw/` 中所有 `processed_at` **不为空** 的文章（即已处理过但可能未生成 clean 文件）
- 跳过 extraction/review/format 步骤
- 直接执行 `writeCleanedArticle()`
- 不修改 `processed_at`（不重复标记）

```bash
# 对未清理的历史案例做后补清理
npx tsx src/index.ts --clean-only

# 也可以指定ID
npx tsx src/index.ts --clean-only --id 100001 100002
```

## 测试

运行后手动验证：
1. 检查生成文件是否包含 base64 图片数据（开头为 `data:image/`）
2. 检查文件是否无 frontmatter
3. 检查文件名是否包含 AI 生成的短标题
