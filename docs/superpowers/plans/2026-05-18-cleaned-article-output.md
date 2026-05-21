# Cleaned Article Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM-based article cleaning + base64 image embedding to article-processor, producing `clean.md` files alongside existing output.

**Architecture:** New `cleaner.ts` module handles LLM cleaning call + image base64 embedding. `index.ts` calls it at end of `processArticle()` and supports `--clean-only` for backfill.

**Tech Stack:** TypeScript, MiniMax (Anthropic SDK), no new dependencies.

---

### Task 1: Add `cleanOnly` to types

**Files:**
- Modify: `scripts/article-processor/src/types.ts:78-84`

- [ ] **Step 1: Add `cleanOnly` field**

```typescript
export interface ProcessorOptions {
  ids: string[];
  rawDir: string;
  outputDir: string;
  skipReview: boolean;
  extractOnly: boolean;
  cleanOnly: boolean;  // only run clean step on already-processed articles
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/types.ts
git commit -m "feat: add cleanOnly option to ProcessorOptions"
```

---

### Task 2: Create `cleaner.ts` module

**Files:**
- Create: `scripts/article-processor/src/cleaner.ts`

- [ ] **Step 1: Write the module**

```typescript
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

const CLEAN_SYSTEM_PROMPT = `你是一位公众号文章清理专家。你的任务是对一篇从微信公众号下载的 Markdown 文章进行清理和美化。

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
}`;

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

export interface CleanResult {
  title: string;
  content: string;
}

/**
 * Call LLM to clean and beautify article markdown content.
 */
async function cleanArticleContent(content: string): Promise<CleanResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: CLEAN_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `请清理并美化以下文章：\n\n${content}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM clean response contains no text block");
  }

  const rawText = textBlock.text;
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from LLM clean response");
  }

  const parsed: CleanResult = JSON.parse(jsonMatch[1].trim());
  if (!parsed.title || !parsed.content) {
    throw new Error("LLM clean response missing title or content");
  }

  return parsed;
}

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

/**
 * Replace all local image references in markdown with base64 data URIs.
 * Images are resolved relative to the article's raw directory.
 */
function embedImagesAsBase64(markdown: string, rawDirPath: string): string {
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let result = markdown;

  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(markdown)) !== null) {
    const altText = match[1];
    const imgPath = match[2];

    // Only process local relative paths
    if (imgPath.startsWith("http") || imgPath.startsWith("data:")) continue;

    const absPath = path.resolve(rawDirPath, imgPath);
    if (!fs.existsSync(absPath)) continue;

    const ext = path.extname(absPath).replace(/^\./, "").toLowerCase();
    const mime = MIME_MAP[ext];
    if (!mime) continue;

    const buffer = fs.readFileSync(absPath);
    const base64 = buffer.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;

    // Escape special regex chars in the original img path for replacement
    const escapedPath = imgPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`!\\[${escapeRegex(altText)}\\]\\(${escapedPath}\\)`),
      `![${altText}](${dataUri})`,
    );
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Full clean pipeline: LLM clean → base64 embed → write file.
 *
 * @param rawDirPath - absolute path to the article's raw directory (dirPath)
 * @param articleId - 6-digit ID string
 * @param content - raw markdown body (no frontmatter)
 * @param outputDir - target processed directory
 */
export async function writeCleanedArticle(
  rawDirPath: string,
  articleId: string,
  content: string,
  outputDir: string,
): Promise<string | null> {
  console.log("    Cleaning article with LLM...");
  const cleaned = await cleanArticleContent(content);

  console.log("    Embedding images as base64...");
  const embedded = embedImagesAsBase64(cleaned.content, rawDirPath);

  // Sanitize title for filename
  const safeTitle = cleaned.title.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "").slice(0, 20);
  const fileName = `${safeTitle}-${articleId}.md`;
  const outputPath = path.join(outputDir, fileName);

  fs.writeFileSync(outputPath, embedded, "utf-8");
  console.log(`    -> ${outputPath}`);

  return outputPath;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/cleaner.ts
git commit -m "feat: add cleaner module with LLM clean + base64 embed"
```

---

### Task 3: Integrate into `processArticle` and add `--clean-only`

**Files:**
- Modify: `scripts/article-processor/src/index.ts`

- [ ] **Step 1: Add import for `writeCleanedArticle`**

Add at line 11:
```typescript
import { writeCleanedArticle } from "./cleaner.js";
```

- [ ] **Step 2: Add `writeCleanedArticle` call in `processArticle`**

Insert after `markAsProcessed(article.dirPath)` (after line 153):
```typescript
    // Step 5: Write cleaned article
    console.log("    Writing cleaned article...");
    await writeCleanedArticle(
      article.dirPath,
      article.id,
      article.content,
      articleOutputDir,
    );
```

- [ ] **Step 3: Add `--clean-only` CLI option**

Add after line 172 (`--extract-only`):
```typescript
    .option("--clean-only", "Only run clean step on already-processed articles")
```

- [ ] **Step 4: Add `cleanOnly` to options parsing**

Update the options construction after line 180:
```typescript
  const options: ProcessorOptions = {
    ids: opts.id || [],
    rawDir: path.resolve(opts.rawDir),
    outputDir: path.resolve(opts.outputDir),
    skipReview: opts.skipReview || false,
    extractOnly: opts.extractOnly || false,
    cleanOnly: opts.cleanOnly || false,
  };
```

- [ ] **Step 5: Add `scanProcessed()` function**

Add after `scanUnprocessed()` (after line 89):
```typescript
/**
 * Scan raw directory for already-processed articles (has processed_at).
 * Used by --clean-only mode.
 */
function scanProcessed(rawDir: string, filterIds?: string[]): RawArticle[] {
  if (!fs.existsSync(rawDir)) {
    console.error(`Raw directory not found: ${rawDir}`);
    return [];
  }

  const entries = fs.readdirSync(rawDir, { withFileTypes: true });
  const articles: RawArticle[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const match = entry.name.match(/^(\d{6})-/);
    if (!match) continue;

    const id = match[1];
    if (filterIds && filterIds.length > 0 && !filterIds.includes(id)) continue;

    const articlePath = path.join(rawDir, entry.name, "article.md");
    if (!fs.existsSync(articlePath)) continue;

    try {
      const raw = fs.readFileSync(articlePath, "utf-8");
      const { data: frontmatter, content } = matter(raw);

      // Only include if already processed
      if (!frontmatter.processed_at) continue;

      articles.push({
        id,
        dirName: entry.name,
        dirPath: path.join(rawDir, entry.name),
        frontmatter: frontmatter as RawArticleFrontmatter,
        content,
      });
    } catch (err) {
      console.warn(`  Warning: Failed to read ${articlePath}: ${err}`);
    }
  }

  articles.sort((a, b) => a.id.localeCompare(b.id));
  return articles;
}
```

- [ ] **Step 6: Add `processCleanOnly()` function**

Add after `processArticle()` (after line 161):
```typescript
/**
 * Run only the clean step for an already-processed article.
 * Skips extraction/review/format/markAsProcessed.
 */
async function processCleanOnly(
  article: RawArticle,
  options: ProcessorOptions,
): Promise<{ success: boolean; error?: string }> {
  console.log(`  [${article.id}] ${article.frontmatter.title || "untitled"}`);

  try {
    const articleOutputDir = path.join(options.outputDir, article.dirName);
    if (!fs.existsSync(articleOutputDir)) {
      fs.mkdirSync(articleOutputDir, { recursive: true });
    }

    await writeCleanedArticle(
      article.dirPath,
      article.id,
      article.content,
      articleOutputDir,
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`    FAILED: ${message}`);
    return { success: false, error: message };
  }
}
```

- [ ] **Step 7: Route to clean-only flow in `main()`**

Replace the current article loading and processing loop (lines 191-219) with:
```typescript
  if (options.cleanOnly) {
    console.log(`Clean-only mode: scanning processed articles in ${options.rawDir}`);
    const articles = scanProcessed(options.rawDir, options.ids);

    if (articles.length === 0) {
      console.log("No processed articles found for clean step.");
      return;
    }

    console.log(`Found ${articles.length} article(s) to clean\n`);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < articles.length; i++) {
      console.log(`[${i + 1}/${articles.length}]`);
      const result = await processCleanOnly(articles[i], options);
      if (result.success) succeeded++;
      else failed++;
      console.log("");
    }

    console.log("=== Summary ===");
    console.log(`Success: ${succeeded}, Failed: ${failed}`);
    return;
  }

  console.log(`Scanning: ${options.rawDir}`);
  const articles = scanUnprocessed(options.rawDir, options.ids);

  if (articles.length === 0) {
    console.log("No unprocessed articles found.");
    return;
  }

  console.log(`Found ${articles.length} article(s) to process\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    console.log(`[${i + 1}/${articles.length}]`);
    const result = await processArticle(articles[i], options);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
    console.log("");
  }

  console.log("=== Summary ===");
  console.log(`Success: ${succeeded}, Failed: ${failed}`);
  if (failed > 0) {
    console.log("Some articles failed. Re-run to retry failed articles.");
  }
```

- [ ] **Step 8: Commit**

```bash
git add scripts/article-processor/src/index.ts
git commit -m "feat: integrate cleaned article output into processor, add --clean-only"
```

---

### Task 4: Verify with a real run

- [ ] **Step 1: Run clean-only on a processed article**

```bash
cd D:\MyWork\LeanMind\LeanStartup && npx tsx scripts/article-processor/src/index.ts --clean-only --id 100045
```

Expected: outputs `resources/processed/100045-260519-xxx/<short-title>-100045.md` with base64 images.

- [ ] **Step 2: Verify the output file**

```bash
head -5 "resources/processed/100045-260519-xxx/"*100045.md
```

Check:
- No frontmatter (should not start with `---`)
- Image references start with `data:image/`
- Filename follows `<title>-<id>.md` format
