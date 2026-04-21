# Article Processor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI script that processes raw WeChat articles into structured, scored markdown using MiniMax-M2.7 LLM.

**Architecture:** Single-pass extraction+scoring LLM call followed by a review+correction LLM call. The CLI scans `resources/raw/` for unprocessed articles, runs them through both LLM calls, writes structured MD to `resources/processed/`, and stamps the original with a `processed_at` timestamp.

**Tech Stack:** TypeScript (Node.js), `@anthropic-ai/sdk` (Anthropic SDK compatible API for MiniMax), `gray-matter` (frontmatter parsing), `commander` (CLI parsing)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/article-processor/package.json` | Dependencies and scripts |
| `scripts/article-processor/tsconfig.json` | TypeScript config (ESM, matching article-downloader pattern) |
| `scripts/article-processor/src/types.ts` | All shared type definitions |
| `scripts/article-processor/src/scorer.ts` | Score dimension definitions, validation, total calculation |
| `scripts/article-processor/src/extractor.ts` | First LLM call: extract + score |
| `scripts/article-processor/src/reviewer.ts` | Second LLM call: review + correct |
| `scripts/article-processor/src/formatter.ts` | JSON → structured MD formatting |
| `scripts/article-processor/src/index.ts` | CLI entry: scan, batch process, summary |

---

### Task 1: Project scaffolding and type definitions

**Files:**
- Create: `scripts/article-processor/package.json`
- Create: `scripts/article-processor/tsconfig.json`
- Create: `scripts/article-processor/src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "article-processor",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "npx tsx src/index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "commander": "^13.1.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "typescript": "^5.8.3",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create types.ts**

```typescript
// src/types.ts

/** Frontmatter of a raw article (resources/raw/<dir>/article.md) */
export interface RawArticleFrontmatter {
  url: string;
  title: string;
  description?: string;
  author?: string;
  coverImage?: string;
  captured_at?: string;
  processed_at?: string; // present if already processed
}

/** A raw article ready for processing */
export interface RawArticle {
  /** 6-digit ID extracted from directory name (e.g., "100001") */
  id: string;
  /** Absolute path to the article directory */
  dirPath: string;
  /** Parsed frontmatter */
  frontmatter: RawArticleFrontmatter;
  /** Full markdown content (excluding frontmatter) */
  content: string;
}

/** 5-dimension score from LLM */
export interface ArticleScore {
  feasibility: number;  // 0-3
  revenue: number;      // 0-2
  timeliness: number;   // 0-2
  detail: number;       // 0-2
  userFit: number;      // 0-1
}

/** Score reasoning for each dimension */
export interface ScoreReasoning {
  feasibility: string;
  revenue: string;
  timeliness: string;
  detail: string;
  userFit: string;
}

/** JSON output from the extraction LLM call */
export interface ExtractionResult {
  sourceTitle: string;
  coreHighlight: string;
  steps: string[];
  tools: string[];
  startupCost: string;
  expectedRevenue: string;
  targetAudience: string;
  pitfalls: string[];
  score: ArticleScore;
  scoreReasoning: ScoreReasoning;
  caseStory: string;
}

/** JSON output from the review LLM call */
export interface ReviewResult {
  /** The corrected extraction result (or original if no corrections needed) */
  extraction: ExtractionResult;
  /** Notes about what was corrected, empty if passed without changes */
  reviewNotes: string[];
  /** Whether the result passed review without corrections */
  passed: boolean;
}

/** CLI options */
export interface ProcessorOptions {
  ids: string[];
  rawDir: string;
  outputDir: string;
  skipReview: boolean;
  extractOnly: boolean;
}
```

- [ ] **Step 4: Install dependencies**

Run: `cd scripts/article-processor && npm install`

- [ ] **Step 5: Commit**

```bash
git add scripts/article-processor/
git commit -m "feat(article-processor): scaffold project with types"
```

---

### Task 2: Score validation module

**Files:**
- Create: `scripts/article-processor/src/scorer.ts`

- [ ] **Step 1: Create scorer.ts with dimension definitions and validation**

```typescript
// src/scorer.ts
import type { ArticleScore } from "./types.js";

export interface ScoreDimension {
  key: keyof ArticleScore;
  label: string;
  max: number;
  criteria: string;
}

/** PRD-defined scoring dimensions */
export const SCORE_DIMENSIONS: ScoreDimension[] = [
  {
    key: "feasibility",
    label: "落地可行性",
    max: 3,
    criteria: "操作难度（低=高分）、启动成本（≤500元加分）、是否需要专业技能（不需要=高分）",
  },
  {
    key: "revenue",
    label: "收益潜力",
    max: 2,
    criteria: "收益稳定性、变现周期（≤7天加分）、收益上限",
  },
  {
    key: "timeliness",
    label: "时效性",
    max: 2,
    criteria: "适配当前市场环境、是否有可持续性、当下热门方向加分",
  },
  {
    key: "detail",
    label: "实操细节",
    max: 2,
    criteria: "操作步骤完整性、避坑提示清晰度、工具可获取性",
  },
  {
    key: "userFit",
    label: "用户适配度",
    max: 1,
    criteria: "是否适合普通用户（无需专业资质、无需大量时间）",
  },
];

/** Maximum total score across all dimensions */
export const MAX_TOTAL_SCORE = SCORE_DIMENSIONS.reduce((sum, d) => sum + d.max, 0); // 10

/**
 * Validate that all score values are within their allowed ranges.
 * Returns an array of error messages (empty if valid).
 */
export function validateScore(score: ArticleScore): string[] {
  const errors: string[] = [];
  for (const dim of SCORE_DIMENSIONS) {
    const val = score[dim.key];
    if (typeof val !== "number" || isNaN(val)) {
      errors.push(`${dim.label}(${dim.key}): not a number`);
    } else if (val < 0) {
      errors.push(`${dim.label}(${dim.key}): ${val} < 0`);
    } else if (val > dim.max) {
      errors.push(`${dim.label}(${dim.key}): ${val} > ${dim.max}`);
    }
  }
  return errors;
}

/**
 * Clamp all score values to their allowed ranges.
 */
export function clampScore(score: ArticleScore): ArticleScore {
  const clamped = { ...score };
  for (const dim of SCORE_DIMENSIONS) {
    const val = clamped[dim.key];
    clamped[dim.key] = Math.max(0, Math.min(dim.max, typeof val === "number" && !isNaN(val) ? val : 0));
  }
  return clamped;
}

/**
 * Calculate total score.
 */
export function totalScore(score: ArticleScore): number {
  return SCORE_DIMENSIONS.reduce((sum, d) => sum + (score[d.key] ?? 0), 0);
}

/**
 * Build a human-readable scoring rubric string for the LLM prompt.
 */
export function scoringRubricText(): string {
  return SCORE_DIMENSIONS.map(
    (d) => `- ${d.label}(${d.key}): 0-${d.max}分, 标准: ${d.criteria}`
  ).join("\n");
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/scorer.ts
git commit -m "feat(article-processor): add score validation and rubric"
```

---

### Task 3: LLM extraction module

**Files:**
- Create: `scripts/article-processor/src/extractor.ts`

- [ ] **Step 1: Create extractor.ts**

```typescript
// src/extractor.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult } from "./types.js";
import { scoringRubricText, clampScore } from "./scorer.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

const EXTRACTION_SYSTEM_PROMPT = `你是一位专业的副业案例分析师。你的任务是分析副业/搞钱类文章，提取结构化信息并进行评分。

## 评分体系（总分10分）
${scoringRubricText()}

## 输出要求
1. 仔细阅读原文，提取以下7大字段
2. 去除所有广告/拉群/关注/求转发等无关内容
3. 仅从原文提取信息，不要编造
4. 如果原文信息不足，对应字段填写"原文未提及"，对应维度给低分
5. sourceTitle 必须从原文标题提取
6. caseStory 用300-800字的叙事手法详述案例故事，开头用吸引读者的钩子切入，保留关键数据和转折点
7. 必须严格按JSON格式输出，不要输出其他内容

## JSON格式
{
  "sourceTitle": "原文标题",
  "coreHighlight": "1-3句概括案例核心价值",
  "steps": ["步骤1", "步骤2"],
  "tools": ["工具1", "工具2"],
  "startupCost": "启动成本（含具体金额）",
  "expectedRevenue": "预期收益（含具体金额）",
  "targetAudience": "适合人群",
  "pitfalls": ["避坑点1", "避坑点2"],
  "score": {
    "feasibility": 0,
    "revenue": 0,
    "timeliness": 0,
    "detail": 0,
    "userFit": 0
  },
  "scoreReasoning": {
    "feasibility": "打分理由",
    "revenue": "打分理由",
    "timeliness": "打分理由",
    "detail": "打分理由",
    "userFit": "打分理由"
  },
  "caseStory": "300-800字案例故事，开头有钩子"
}`;

/**
 * Call MiniMax LLM to extract structured data and score from an article.
 */
export async function extractArticle(
  articleContent: string
): Promise<ExtractionResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `请分析以下副业案例文章并提取结构化信息：\n\n${articleContent}`,
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM response contains no text block");
  }

  const rawText = textBlock.text;

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from LLM response");
  }

  const parsed: ExtractionResult = JSON.parse(jsonMatch[1].trim());

  // Clamp scores to valid ranges
  parsed.score = clampScore(parsed.score);

  // Ensure arrays
  if (!Array.isArray(parsed.steps)) parsed.steps = [];
  if (!Array.isArray(parsed.tools)) parsed.tools = [];
  if (!Array.isArray(parsed.pitfalls)) parsed.pitfalls = [];

  return parsed;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/extractor.ts
git commit -m "feat(article-processor): add LLM extraction module"
```

---

### Task 4: LLM review module

**Files:**
- Create: `scripts/article-processor/src/reviewer.ts`

- [ ] **Step 1: Create reviewer.ts**

```typescript
// src/reviewer.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult, ReviewResult } from "./types.js";
import { clampScore } from "./scorer.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

const REVIEW_SYSTEM_PROMPT = `你是一位严格的副业案例质量审核员。你需要审核AI提取的结构化案例数据是否准确、完整。

## 审核维度
1. 字段完整性：7大字段是否都有实质内容（非"原文未提及"）
2. 案例故事质量：是否有钩子、字数是否在300-800范围、是否去除了广告内容、关键数据和转折点是否保留
3. 打分合理性：分数是否与原文内容匹配
4. 事实性校验：金额、数字、工具名、平台名是否准确提取
5. 步骤完整性：操作步骤是否有明显遗漏
6. 广告残留：是否还有广告/拉群/关注内容残留

## 输出要求
如果发现任何问题，直接在extraction中修正，并在reviewNotes中说明修正内容。
如果没有问题，原样返回extraction，reviewNotes为空数组，passed设为true。

必须严格按JSON格式输出：
{
  "extraction": { ...(修正后的完整extraction对象) },
  "reviewNotes": ["修正说明1", "修正说明2"],
  "passed": true或false
}`;

/**
 * Call MiniMax LLM to review and correct extraction results.
 */
export async function reviewExtraction(
  articleContent: string,
  extraction: ExtractionResult
): Promise<ReviewResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: REVIEW_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `## 原文内容\n${articleContent}\n\n## AI提取结果\n${JSON.stringify(extraction, null, 2)}\n\n请审核以上提取结果，如有问题请修正。`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM review response contains no text block");
  }

  const rawText = textBlock.text;

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from LLM review response");
  }

  const parsed: ReviewResult = JSON.parse(jsonMatch[1].trim());

  // Clamp scores in the corrected extraction
  parsed.extraction.score = clampScore(parsed.extraction.score);

  // Ensure arrays
  if (!Array.isArray(parsed.extraction.steps)) parsed.extraction.steps = [];
  if (!Array.isArray(parsed.extraction.tools)) parsed.extraction.tools = [];
  if (!Array.isArray(parsed.extraction.pitfalls)) parsed.extraction.pitfalls = [];
  if (!Array.isArray(parsed.reviewNotes)) parsed.reviewNotes = [];

  return parsed;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/reviewer.ts
git commit -m "feat(article-processor): add LLM review module"
```

---

### Task 5: Markdown formatter module

**Files:**
- Create: `scripts/article-processor/src/formatter.ts`

- [ ] **Step 1: Create formatter.ts**

```typescript
// src/formatter.ts
import type { ExtractionResult, RawArticle } from "./types.js";
import { totalScore } from "./scorer.js";

/**
 * Format an extraction result into the structured MD output.
 * Output format matches the PRD-defined template.
 */
export function formatProcessedMarkdown(
  article: RawArticle,
  extraction: ExtractionResult
): string {
  const total = totalScore(extraction.score);
  const timestamp = new Date().toISOString();

  // Frontmatter
  const frontmatter = [
    `id: "${article.id}"`,
    `source_title: "${escapeYaml(extraction.sourceTitle || article.frontmatter.title)}"`,
    `source_url: "${article.frontmatter.url}"`,
    `source_author: "${escapeYaml(article.frontmatter.author || "")}"`,
    `processed_at: "${timestamp}"`,
    `total_score: ${total}`,
    `scores:`,
    `  feasibility: ${extraction.score.feasibility}`,
    `  revenue: ${extraction.score.revenue}`,
    `  timeliness: ${extraction.score.timeliness}`,
    `  detail: ${extraction.score.detail}`,
    `  userFit: ${extraction.score.userFit}`,
  ].join("\n");

  // Body sections
  const sections: string[] = [];

  // Case story
  sections.push(`## 案例故事\n\n${extraction.caseStory}`);

  // Core highlight
  sections.push(`## 核心亮点\n\n${extraction.coreHighlight}`);

  // Steps
  if (extraction.steps.length > 0) {
    const stepsList = extraction.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
    sections.push(`## 操作步骤\n\n${stepsList}`);
  }

  // Tools
  if (extraction.tools.length > 0) {
    const toolsList = extraction.tools.map((t) => `- ${t}`).join("\n");
    sections.push(`## 所需工具\n\n${toolsList}`);
  }

  // Startup cost
  sections.push(`## 启动成本\n\n${extraction.startupCost}`);

  // Expected revenue
  sections.push(`## 预期收益\n\n${extraction.expectedRevenue}`);

  // Target audience
  sections.push(`## 适合人群\n\n${extraction.targetAudience}`);

  // Pitfalls
  if (extraction.pitfalls.length > 0) {
    const pitfallsList = extraction.pitfalls.map((p) => `- ${p}`).join("\n");
    sections.push(`## 避坑指南\n\n${pitfallsList}`);
  }

  return `---\n${frontmatter}\n---\n\n${sections.join("\n\n")}\n`;
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"');
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/formatter.ts
git commit -m "feat(article-processor): add markdown formatter"
```

---

### Task 6: CLI entry point and batch processing

**Files:**
- Create: `scripts/article-processor/src/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
// src/index.ts
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { Command } from "commander";
import type { RawArticle, ProcessorOptions } from "./types.js";
import { validateScore } from "./scorer.js";
import { extractArticle } from "./extractor.js";
import { reviewExtraction } from "./reviewer.js";
import { formatProcessedMarkdown } from "./formatter.js";

const DEFAULT_RAW_DIR = path.resolve("resources/raw");
const DEFAULT_OUTPUT_DIR = path.resolve("resources/processed");

/**
 * Scan raw directory for unprocessed articles.
 */
function scanUnprocessed(rawDir: string, filterIds?: string[]): RawArticle[] {
  if (!fs.existsSync(rawDir)) {
    console.error(`Raw directory not found: ${rawDir}`);
    return [];
  }

  const entries = fs.readdirSync(rawDir, { withFileTypes: true });
  const articles: RawArticle[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Extract 6-digit ID from directory name
    const match = entry.name.match(/^(\d{6})-/);
    if (!match) continue;

    const id = match[1];

    // Filter by IDs if specified
    if (filterIds && filterIds.length > 0 && !filterIds.includes(id)) continue;

    const articlePath = path.join(rawDir, entry.name, "article.md");
    if (!fs.existsSync(articlePath)) continue;

    try {
      const raw = fs.readFileSync(articlePath, "utf-8");
      const { data: frontmatter, content } = matter(raw);

      // Skip if already processed
      if (frontmatter.processed_at) continue;

      articles.push({
        id,
        dirPath: path.join(rawDir, entry.name),
        frontmatter,
        content,
      });
    } catch (err) {
      console.warn(`  Warning: Failed to read ${articlePath}: ${err}`);
    }
  }

  // Sort by ID ascending
  articles.sort((a, b) => a.id.localeCompare(b.id));
  return articles;
}

/**
 * Mark original article as processed by adding processed_at to frontmatter.
 */
function markAsProcessed(dirPath: string): void {
  const articlePath = path.join(dirPath, "article.md");
  const raw = fs.readFileSync(articlePath, "utf-8");
  const { data, content } = matter(raw);
  data.processed_at = new Date().toISOString();
  const updated = matter.stringify(content, data);
  fs.writeFileSync(articlePath, updated, "utf-8");
}

/**
 * Process a single article through the full pipeline.
 */
async function processArticle(
  article: RawArticle,
  options: ProcessorOptions
): Promise<{ success: boolean; error?: string }> {
  console.log(`  [${article.id}] ${article.frontmatter.title || "untitled"}`);

  try {
    // Step 1: Extract + Score
    console.log("    Extracting...");
    const fullContent = article.content;
    let extraction = await extractArticle(fullContent);

    // Validate scores
    const scoreErrors = validateScore(extraction.score);
    if (scoreErrors.length > 0) {
      console.warn(`    Score validation warnings: ${scoreErrors.join("; ")}`);
    }

    // Step 2: Review (unless skipped)
    if (!options.skipReview && !options.extractOnly) {
      console.log("    Reviewing...");
      const reviewResult = await reviewExtraction(fullContent, extraction);
      extraction = reviewResult.extraction;

      if (reviewResult.reviewNotes.length > 0) {
        console.log(`    Review corrections: ${reviewResult.reviewNotes.length} item(s)`);
        for (const note of reviewResult.reviewNotes) {
          console.log(`      - ${note}`);
        }
      } else {
        console.log("    Review passed without corrections");
      }
    }

    // Step 3: Format and write output
    const outputMarkdown = formatProcessedMarkdown(article, extraction);

    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    const outputPath = path.join(options.outputDir, `${article.id}.md`);
    fs.writeFileSync(outputPath, outputMarkdown, "utf-8");
    console.log(`    -> ${outputPath}`);

    // Step 4: Mark original as processed
    markAsProcessed(article.dirPath);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`    FAILED: ${message}`);
    return { success: false, error: message };
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("article-processor")
    .description("Process raw articles with LLM extraction, scoring, and review")
    .option("--id <ids...>", "Process specific article IDs (e.g., --id 100001 100002)")
    .option("--raw-dir <dir>", "Raw articles directory", DEFAULT_RAW_DIR)
    .option("--output-dir <dir>", "Output directory", DEFAULT_OUTPUT_DIR)
    .option("--skip-review", "Skip the review step")
    .option("--extract-only", "Extract only, no scoring (debug mode)")
    .parse();

  const opts = program.opts();
  const options: ProcessorOptions = {
    ids: opts.id || [],
    rawDir: path.resolve(opts.rawDir),
    outputDir: path.resolve(opts.outputDir),
    skipReview: opts.skipReview || false,
    extractOnly: opts.extractOnly || false,
  };

  // Validate API key
  if (!process.env.MINIMAX_API_KEY) {
    console.error("Error: MINIMAX_API_KEY environment variable is required");
    console.error("Set it with: export MINIMAX_API_KEY=your-key-here");
    process.exit(1);
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
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/article-processor/src/index.ts
git commit -m "feat(article-processor): add CLI entry point with batch processing"
```

---

### Task 7: End-to-end test with real articles

**Files:**
- No new files

- [ ] **Step 1: Verify project structure**

Run: `ls -la scripts/article-processor/src/`

Expected: 6 files: `types.ts`, `scorer.ts`, `extractor.ts`, `reviewer.ts`, `formatter.ts`, `index.ts`

- [ ] **Step 2: Run TypeScript check**

Run: `cd scripts/article-processor && npx tsc --noEmit`

Expected: No errors

- [ ] **Step 3: Test with a single article**

Run: `cd d:/MyWork/LeanMind/LeanStartup && MINIMAX_API_KEY=test npx tsx scripts/article-processor/src/index.ts --id 100001`

Expected: Should fail with an authentication error (since we're using a test key), confirming the full pipeline is wired up correctly. The error should come from the Anthropic SDK trying to connect to MiniMax.

- [ ] **Step 4: Test scanning logic without API key**

Verify that the scanner correctly finds unprocessed articles by checking the console output mentions the right count.

- [ ] **Step 5: Commit any fixes**

If any issues were found and fixed during testing, commit them.

```bash
git add scripts/article-processor/
git commit -m "fix(article-processor): address issues found during e2e test"
```
