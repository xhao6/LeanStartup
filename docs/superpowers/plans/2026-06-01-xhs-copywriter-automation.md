# XHS Copywriter Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone CLI command that generates Xiaohongshu-style copy based on daily cases + real XHS trending data + MiniMax AI.

**Architecture:** New `copywriter.ts` CLI entry that reads CloudBase data, calls xhs-copywriter-redfox Python script for real trending data, then uses MiniMax (via Anthropic SDK) to generate copy. Outputs plain text to `output/{date}/xhs-copy.txt`.

**Tech Stack:** TypeScript, @anthropic-ai/sdk (MiniMax via Anthropic-compatible API), child_process (Python script), CloudBase NoSQL SDK

---

### Task 1: Install dependency

**Files:**
- Modify: `scripts/reporter/package.json`

- [ ] **Step 1: Install @anthropic-ai/sdk**

Run: `pnpm add @anthropic-ai/sdk`

Verify the dependency appears in `package.json`:
```
"@anthropic-ai/sdk": "^0.52.0"
```

---

### Task 2: Create lib/copywriter.ts — core logic

**Files:**
- Create: `scripts/reporter/src/lib/copywriter.ts`

- [ ] **Step 1: Create the file with all imports and constants**

```typescript
import { getDatabase } from "../cloudbase.js"
import { fetchDailyPick } from "../data/daily-pick.js"
import { fetchCasesByIds } from "../data/case.js"
import type { CaseRecord } from "../types.js"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "../config.js"
import Anthropic from "@anthropic-ai/sdk"

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))

const XHS_SCRIPT = resolve(
  __dirname, "../../../../skills/xhs-copywriter-redfox/scripts/fetch_xhs_trends.py"
)

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic"
const MINIMAX_MODEL = "MiniMax-M2.7"
```

- [ ] **Step 2: Add helper to extract keywords from case tags**

```typescript
function extractKeywords(cases: CaseRecord[]): string {
  const tagCount = new Map<string, number>()
  for (const c of cases) {
    for (const t of c.tags ?? []) {
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
    }
  }
  const sorted = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  let keywords = sorted.join(",")
  if (keywords.length > 200) {
    keywords = keywords.slice(0, 200)
    const last = keywords.lastIndexOf(",")
    if (last > 0) keywords = keywords.slice(0, last)
  }
  return keywords || "一人公司,独立开发,AI副业"
}
```

- [ ] **Step 3: Add function to fetch XHS trending data via Python script**

```typescript
async function fetchTrends(keywords: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("python3", [
      XHS_SCRIPT,
      "--keyword", keywords,
      "--max-items", "8",
      "--output-format", "json",
    ], { timeout: 60000 })
    return stdout
  } catch {
    console.warn("Warning: failed to fetch XHS trends, proceeding without trend data")
    return ""
  }
}
```

- [ ] **Step 4: Add System Prompt constant**

```typescript
const SYSTEM_PROMPT = `你是一个小红书爆款文案写手。你的任务是基于真实数据和案例生成可直接发布的小红书笔记文案。

## 标题规则
- 参考爆款数据中出现的标题模式（数字型、情绪型、疑问型、悬念型）
- 每个标题不超过20字
- 生成6个不同风格的推荐标题

## 正文规则
- 开头必须使用钩子：痛点共鸣、惊人数据、反差对比等手法
- 正文采用分点/分段结构，融入案例核心信息
- 结尾添加互动引导话术
- 每段可用1-2个Emoji点缀
- 保持口语化、亲切感、代入感

## 格式约束（必须严格遵守）
- 纯文本，不使用任何Markdown语法
- 不包含投入、周期、收入等商业数据
- 标签以#开头，空格分隔
- 爆款公式来源中列出参考的笔记时，使用纯文本格式

## 输出格式
推荐标题

1. 标题1
2. 标题2
3. 标题3
4. 标题4
5. 标题5
6. 标题6

正文内容

[正文]

推荐标签

#标签1 #标签2 ...

爆款公式来源

参考的爆款规律：[简述]
参考的爆款笔记
1. 标题 - 作者 - 收藏X 点赞X

## 自检清单
输出前检查：
- 是否包含6个推荐标题？
- 正文是否完整可发布？
- 标签是否5-10个？
- 爆款公式来源是否包含规律简述和参考笔记？`
```

- [ ] **Step 5: Add main generateXhsCopy function**

```typescript
export async function generateXhsCopy(date: string): Promise<string> {
  const db = getDatabase()

  const pick = await fetchDailyPick(db, date)
  if (!pick) throw new Error(`No daily pick found for ${date}`)

  const allCases = await fetchCasesByIds(db, pick.case_ids)
  const caseMap = new Map(allCases.map((c) => [c.id, c]))
  const orderedCases = pick.case_ids
    .map((id) => caseMap.get(id))
    .filter((c): c is CaseRecord => !!c)

  const keywords = extractKeywords(orderedCases)
  const trendsJson = await fetchTrends(keywords)

  const caseData = orderedCases.map((c, i) =>
    `案例${i + 1}：${c.title}\n摘要：${c.summary}\n标签：${(c.tags ?? []).join("、")}\n来源：${c.source_account ?? ""}`
  ).join("\n\n")

  const userPrompt = `## 今日案例数据\n\n${caseData}\n\n## 小红书爆款数据\n\n${trendsJson}`

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not set")

  const client = new Anthropic({
    apiKey,
    baseURL: MINIMAX_BASE_URL,
  })

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || !("text" in textBlock)) throw new Error("No text in MiniMax response")

  const outputDir = resolve(config.OUTPUT_DIR, date)
  const outputPath = resolve(outputDir, "xhs-copy.txt")

  writeFileSync(outputPath, textBlock.text, "utf-8")
  return outputPath
}
```

---

### Task 3: Create copywriter.ts — CLI entry

**Files:**
- Create: `scripts/reporter/src/copywriter.ts`

```typescript
#!/usr/bin/env node
import { generateXhsCopy } from "./lib/copywriter.js"
import { ensureOutputDir } from "./config.js"

async function main() {
  ensureOutputDir()

  const args = process.argv.slice(2)
  const command = args[0]

  if (command !== "daily" || args.includes("--help")) {
    console.log(`Usage: npx tsx src/copywriter.ts daily [date]

Examples:
  npx tsx src/copywriter.ts daily
  npx tsx src/copywriter.ts daily 2026-06-01
`)
    process.exit(command === "--help" ? 0 : 1)
  }

  const date = args[1] || new Date().toISOString().slice(0, 10)
  console.log(`Generating XHS copy for ${date}...`)

  const path = await generateXhsCopy(date)
  console.log(`  xhs-copy: ${path}`)
}

main().catch((err) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
```

---

### Task 4: Write test

**Files:**
- Create: `scripts/reporter/src/__tests__/copywriter.test.ts`

- [ ] **Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../cloudbase.js", () => ({
  getDatabase: vi.fn(() => ({})),
}))

vi.mock("../data/daily-pick.js", () => ({
  fetchDailyPick: vi.fn(),
}))

vi.mock("../data/case.js", () => ({
  fetchCasesByIds: vi.fn(),
}))

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "推荐标题\n\n1. 测试标题" }],
        }),
      },
    })),
  }
})

describe("generateXhsCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw when no daily pick found", async () => {
    const { fetchDailyPick } = await import("../data/daily-pick.js")
    vi.mocked(fetchDailyPick).mockResolvedValue(null)

    const { generateXhsCopy } = await import("../lib/copywriter.js")
    await expect(generateXhsCopy("2026-06-01")).rejects.toThrow("No daily pick found")
  })

  it("should throw when MINIMAX_API_KEY is not set", async () => {
    const { fetchDailyPick } = await import("../data/daily-pick.js")
    vi.mocked(fetchDailyPick).mockResolvedValue({
      _id: "1", date: "2026-06-01", case_ids: ["100011"], created_at: "",
    })
    const { fetchCasesByIds } = await import("../data/case.js")
    vi.mocked(fetchCasesByIds).mockResolvedValue([{
      id: "100011", title: "测试案例", summary: "摘要", tags: ["AI"],
      source_account: "test", status: "published",
      score_total: 10, score_feasibility: 3, score_profit: 2,
      score_timeliness: 2, score_detail: 2, score_fitness: 1,
      created_at: "", updated_at: "",
    }])

    const { generateXhsCopy } = await import("../lib/copywriter.js")
    const origKey = process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_API_KEY
    await expect(generateXhsCopy("2026-06-01")).rejects.toThrow("MINIMAX_API_KEY")
    if (origKey) process.env.MINIMAX_API_KEY = origKey
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/__tests__/copywriter.test.ts`
Expected: PASS

---

### Task 5: Update package.json with new script

**Files:**
- Modify: `scripts/reporter/package.json`

- [ ] **Step 1: Add copywriter script**

Add to the `scripts` section in `package.json`:
```json
"copywrite": "npx tsx src/copywriter.ts"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Run the copywriter command**

Run: `npx tsx src/copywriter.ts daily 2026-06-01`

Expected output:
```
Generating XHS copy for 2026-06-01...
  xhs-copy: /path/to/output/2026-06-01/xhs-copy.txt
```

- [ ] **Step 2: Verify output file**

Check that `output/2026-06-01/xhs-copy.txt` exists and contains plain text with:
- 推荐标题 header
- 6 titles
- 正文内容 header + body
- 推荐标签 header + #tags
- 爆款公式来源 header
