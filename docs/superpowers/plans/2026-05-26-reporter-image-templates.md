# Reporter 图片模板生成器 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 在 `scripts/reporter/` 下构建一个 CLI 工具，从 CloudBase 数据库获取案例数据，渲染 3 个 3:4 比例（1080x1440px）的 HTML 模板，用 Puppeteer 截图输出为小红书高密度信息图片。

**架构:** 独立 TypeScript ESM 子项目。分层：CLI 入口(index.ts) → 数据查询(data/) → 模板引擎渲染(templates/) → Puppeteer 截图(browser/)。所有模块通过依赖注入实现可测试性。遵循 TDD 铁律。

**技术栈:** TypeScript (ES2022 + ESM) · tsx (运行时) · @cloudbase/node-sdk · Puppeteer · Sharp · Vitest

**设计系统:** 见 [评审终稿 v5](#) — 纯白底 #FFFFFF，深墨蓝 #1A1A2E 主文字，品牌玫红 #E94560，金徽章 #F5A623/#B45309，深色横幅 #2D2D3F。字体 Noto Serif SC 700 + Noto Sans SC 400/600 + Roboto Mono 700。字号几何级数 48/32/21。画布 1080x1440px，45/55 左右分区，三模板统一深色顶横幅，120px 底部安全区。

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `scripts/reporter/package.json` | 独立包，ESM，依赖声明 |
| `scripts/reporter/tsconfig.json` | ES2022 + bundler 模块解析 |
| `scripts/reporter/vitest.config.ts` | Vitest 配置 |
| `scripts/reporter/.gitignore` | 忽略 output/ node_modules/ |
| `scripts/reporter/src/index.ts` | CLI 入口，命令路由 |
| `scripts/reporter/src/config.ts` | 环境变量校验 + 路径常量化 |
| `scripts/reporter/src/types.ts` | 共享类型（Case, DailyPick, TemplateContext） |
| `scripts/reporter/src/cloudbase.ts` | CloudBase SDK 初始化 |
| `scripts/reporter/src/data/daily-pick.ts` | DailyPick 集合查询 |
| `scripts/reporter/src/data/case.ts` | Case 集合查询 |
| `scripts/reporter/src/templates/engine.ts` | HTML 模板加载 + 占位符替换 |
| `scripts/reporter/src/templates/top3.ts` | HTML-1 数据 → HTML 字符串 |
| `scripts/reporter/src/templates/case-detail.ts` | HTML-2 数据 → HTML 字符串 |
| `scripts/reporter/src/templates/last3days.ts` | HTML-3 数据 → HTML 字符串 |
| `scripts/reporter/src/templates/html/top3.html` | HTML-1 静态模板 |
| `scripts/reporter/src/templates/html/case-detail.html` | HTML-2 静态模板 |
| `scripts/reporter/src/templates/html/last3days.html` | HTML-3 静态模板 |
| `scripts/reporter/src/browser/pool.ts` | BrowserPool 单例（并发安全） |
| `scripts/reporter/src/browser/screenshot.ts` | HTML → PNG/JPEG 渲染管道 |
| `scripts/reporter/src/lib/report.ts` | 主流程编排（获取数据 → 渲染 → 截图） |
| `scripts/reporter/src/__tests__/config.test.ts` | config 模块测试 |
| `scripts/reporter/src/__tests__/data.test.ts` | 数据查询测试（Mock 链） |
| `scripts/reporter/src/__tests__/templates.test.ts` | 模板渲染测试（内容验证） |
| `scripts/reporter/src/__tests__/screenshot.test.ts` | 截图管道测试 |
| `scripts/reporter/src/__tests__/report.test.ts` | 端到端集成测试 |

---

### Task 1: 项目脚手架

**文件:**
- Create: `scripts/reporter/package.json`
- Create: `scripts/reporter/tsconfig.json`
- Create: `scripts/reporter/vitest.config.ts`
- Create: `scripts/reporter/.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "reporter",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "npx tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@cloudbase/node-sdk": "^3.18.1",
    "dotenv": "^17.4.2",
    "puppeteer": "^24.39.1",
    "sharp": "^0.34.5"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.3",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

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

- [ ] **Step 3: 创建 vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: 创建 .gitignore**

```
output/
node_modules/
dist/
*.jpg
*.png
```

- [ ] **Step 5: 安装依赖并验证**

```bash
pnpm install
```

Run: `npx tsx --version`
Expected: tsx version printed

- [ ] **Step 6: Commit**

```bash
git add scripts/reporter/
git commit -m "feat: add reporter project scaffold"
```

---

### Task 2: 类型定义

**文件:**
- Create: `scripts/reporter/src/types.ts`

- [ ] **Step 1: 写类型文件**

```ts
// 数据库 Case 记录（对齐 sync-to-db parser 输出字段）
export interface CaseRecord {
  _id: string
  id: string
  title: string
  source_account?: string
  source_url?: string
  summary?: string
  case_story?: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  cost?: string
  expected_revenue?: string
  cycle?: string
  suitable_for?: string
  steps?: Array<{ step: string } | string>
  tools?: Array<{ name: string; desc: string }>
  pitfalls?: string
  risk_tags?: string[]
  tags?: string[]
  status: string
  created_at: string
  updated_at: string
  published_at?: string
}

// 数据库 DailyPick 记录
export interface DailyPickRecord {
  _id: string
  date: string        // "YYYY-MM-DD"
  case_ids: string[]  // 有序，排列即排名
  created_at: string  // "YYYY-MM-DD HH:mm:ss"
}

// 模板渲染上下文
export interface Top3Context {
  date: string
  cases: Top3Case[]
}

export interface Top3Case {
  id: string
  rank: number
  title: string
  summary: string
  score_total: number
  cost: string
  expected_revenue: string
  cycle: string
  suitable_for: string
  source_account: string
  tags: string[]
}

export interface CaseDetailContext {
  title: string
  source_account: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  summary: string
  case_story: string
  steps: string[]
  tools: Array<{ name: string; desc: string }>
  pitfalls: string
  risk_tags: string[]
  cost: string
  expected_revenue: string
  cycle: string
  suitable_for: string
}

export interface Last3DaysContext {
  days: DayGroup[]
}

export interface DayGroup {
  date: string
  dayLabel: string   // "DAY 1 · 5月26日 周一"
  cases: Top3Case[]
}

// 查询返回
export interface QueryResult<T> {
  data: T | null
  error?: string
}

// 截图结果
export interface ScreenshotResult {
  path: string
  width: number
  height: number
  sizeBytes: number
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add scripts/reporter/src/types.ts
git commit -m "feat: define reporter type definitions"
```

---

### Task 3: 配置与启动校验

**文件:**
- Create: `scripts/reporter/src/config.ts`
- Create: `scripts/reporter/src/__tests__/config.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/__tests__/config.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const envBackup = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  process.env = { ...envBackup }
})

afterEach(() => {
  process.env = { ...envBackup }
})

describe("config", () => {
  it("throws when CLOUDBASE_ENV_ID is missing", async () => {
    delete process.env.CLOUDBASE_ENV_ID
    await expect(import("../config")).rejects.toThrow("CLOUDBASE_ENV_ID")
  })

  it("throws when CLOUDBASE_SECRET_ID is missing", async () => {
    delete process.env.CLOUDBASE_SECRET_ID
    await expect(import("../config")).rejects.toThrow("CLOUDBASE_SECRET_ID")
  })

  it("throws when CLOUDBASE_SECRET_KEY is missing", async () => {
    delete process.env.CLOUDBASE_SECRET_KEY
    await expect(import("../config")).rejects.toThrow("CLOUDBASE_SECRET_KEY")
  })

  it("resolves config with all env vars present", async () => {
    process.env.CLOUDBASE_ENV_ID = "test-env"
    process.env.CLOUDBASE_SECRET_ID = "test-id"
    process.env.CLOUDBASE_SECRET_KEY = "test-key"
    const { config } = await import("../config")
    expect(config.ENV_ID).toBe("test-env")
    expect(config.OUTPUT_DIR).toContain("output")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/config.test.ts
```

Expected: 3 of 4 tests FAIL (配置模块尚未实现)

- [ ] **Step 3: 实现 config.ts**

```ts
import "dotenv/config"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")

export const config = {
  ENV_ID: validate("CLOUDBASE_ENV_ID"),
  SECRET_ID: validate("CLOUDBASE_SECRET_ID"),
  SECRET_KEY: validate("CLOUDBASE_SECRET_KEY"),
  OUTPUT_DIR: path.resolve(PROJECT_ROOT, "output"),
  FONTS_DIR: path.resolve(PROJECT_ROOT, "fonts"),
}

function validate(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`${key} is not set in environment`)
  return val
}

export function ensureOutputDir(): void {
  fs.mkdirSync(config.OUTPUT_DIR, { recursive: true })
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/config.test.ts
```

Expected: 4 of 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/reporter/src/config.ts scripts/reporter/src/__tests__/config.test.ts
git commit -m "feat: add config module with env validation"
```

---

### Task 4: CloudBase 客户端

**文件:**
- Create: `scripts/reporter/src/cloudbase.ts`

- [ ] **Step 1: 创建 cloudbase.ts**

```ts
import cloudbase from "@cloudbase/node-sdk"
import { config } from "./config.js"

let _app: ReturnType<typeof cloudbase.init> | null = null

export function getCloudBase() {
  if (!_app) {
    _app = cloudbase.init({
      env: config.ENV_ID,
      secretId: config.SECRET_ID,
      secretKey: config.SECRET_KEY,
    })
  }
  return _app
}

export function getDatabase() {
  return getCloudBase().database()
}
```

- [ ] **Step 2: 验证类型编译**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add scripts/reporter/src/cloudbase.ts
git commit -m "feat: add CloudBase client singleton"
```

---

### Task 5: 数据查询层 — DailyPick

**文件:**
- Create: `scripts/reporter/src/data/daily-pick.ts`
- Create: `scripts/reporter/src/__tests__/data.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/__tests__/data.test.ts (添加 DailyPick 测试)
import { describe, it, expect, vi, beforeEach } from "vitest"

function mockChain(returnData: any) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ data: returnData }),
    count: vi.fn(),
  }
}

describe("fetchDailyPick", () => {
  it("returns null when no pick for date", async () => {
    const chain = mockChain([])
    const db = { collection: vi.fn(() => chain) }
    const { fetchDailyPick } = await import("../data/daily-pick.js")

    const result = await fetchDailyPick(db as any, "2026-05-26")
    expect(result).toBeNull()
  })

  it("returns DailyPick record for given date", async () => {
    const expectedPick = { _id: "x", date: "2026-05-26", case_ids: ["a","b","c"], created_at: "..." }
    const chain = mockChain([expectedPick])
    const db = { collection: vi.fn(() => chain) }
    const { fetchDailyPick } = await import("../data/daily-pick.js")

    const result = await fetchDailyPick(db as any, "2026-05-26")
    expect(result).toEqual(expectedPick)
  })

  it("returns last N records ordered by date desc", async () => {
    const picks = [
      { date: "2026-05-26", case_ids: ["a","b","c"] },
      { date: "2026-05-25", case_ids: ["d","e","f"] },
      { date: "2026-05-24", case_ids: ["g","h","i"] },
    ]
    const chain = mockChain(picks)
    chain.count = vi.fn().mockResolvedValue({ total: 3 })
    const db = { collection: vi.fn(() => chain) }
    const { fetchRecentPicks } = await import("../data/daily-pick.js")

    const result = await fetchRecentPicks(db as any, 3)
    expect(result).toHaveLength(3)
    expect(result[0].date).toBe("2026-05-26")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/data.test.ts
```

Expected: 3 of 3 tests FAIL

- [ ] **Step 3: 实现 daily-pick.ts**

```ts
import type { DailyPickRecord } from "../types.js"

export async function fetchDailyPick(
  db: any,
  date: string
): Promise<DailyPickRecord | null> {
  const { data } = await db
    .collection("DailyPick")
    .where({ date })
    .limit(1)
    .get()

  return data?.[0] ?? null
}

export async function fetchRecentPicks(
  db: any,
  count: number
): Promise<DailyPickRecord[]> {
  const { data } = await db
    .collection("DailyPick")
    .orderBy("date", "desc")
    .limit(count)
    .get()

  return data ?? []
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/data.test.ts
```

Expected: 3 of 3 tests PASS

---

### Task 6: 数据查询层 — Case

**文件:**
- Modify: `scripts/reporter/src/__tests__/data.test.ts` (追加 Case 测试)
- Create: `scripts/reporter/src/data/case.ts`

- [ ] **Step 1: 在 data.test.ts 中追加 Case 的失败测试**

```ts
// 追加到 data.test.ts
describe("fetchCasesByIds", () => {
  it("returns empty array when no ids provided", async () => {
    const { fetchCasesByIds } = await import("../data/case.js")
    const db = { collection: vi.fn() } as any
    const result = await fetchCasesByIds(db, [])
    expect(result).toEqual([])
  })

  it("fetches cases in bulk by id array", async () => {
    const cases = [
      { id: "100001", title: "Case 1", score_total: 7 },
      { id: "100002", title: "Case 2", score_total: 8 },
    ]
    const chain = mockChain(cases)
    const db = { collection: vi.fn(() => chain) } as any
    const { fetchCasesByIds } = await import("../data/case.js")

    const result = await fetchCasesByIds(db, ["100001", "100002"])
    expect(result).toHaveLength(2)
  })
})

describe("fetchCaseById", () => {
  it("returns null when case not found", async () => {
    const chain = mockChain([])
    const db = { collection: vi.fn(() => chain) } as any
    const { fetchCaseById } = await import("../data/case.js")

    const result = await fetchCaseById(db, "nonexistent")
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/data.test.ts
```

Expected: Case 测试全部 FAIL

- [ ] **Step 3: 实现 case.ts**

```ts
import type { CaseRecord } from "../types.js"

export async function fetchCasesByIds(
  db: any,
  ids: string[]
): Promise<CaseRecord[]> {
  if (ids.length === 0) return []

  const cmd = db.command
  const { data } = await db
    .collection("Case")
    .where({
      id: cmd.in(ids),
      status: "published",
    })
    .limit(100)
    .get()

  return data ?? []
}

export async function fetchCaseById(
  db: any,
  id: string
): Promise<CaseRecord | null> {
  const { data } = await db
    .collection("Case")
    .where({ id, status: "published" })
    .limit(1)
    .get()

  return data?.[0] ?? null
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/data.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/reporter/src/data/ scripts/reporter/src/__tests__/data.test.ts
git commit -m "feat: add DailyPick and Case data query layer"
```

---

### Task 7: 模板引擎

**文件:**
- Create: `scripts/reporter/src/templates/engine.ts`
- Create: `scripts/reporter/src/__tests__/templates.test.ts`

占位符约定：`{{variableName}}` 将被替换为值，`{{#each items}}...{{/each}}` 循环。

- [ ] **Step 1: 写引擎测试**

```ts
// src/__tests__/templates.test.ts (部分)
import { describe, it, expect } from "vitest"
import { renderTemplate } from "../templates/engine.js"

describe("renderTemplate", () => {
  it("replaces single placeholder", () => {
    const html = "<h1>{{title}}</h1>"
    const result = renderTemplate(html, { title: "Hello" })
    expect(result).toBe("<h1>Hello</h1>")
  })

  it("replaces multiple placeholders", () => {
    const html = "<div>{{a}} {{b}}</div>"
    const result = renderTemplate(html, { a: "1", b: "2" })
    expect(result).toBe("<div>1 2</div>")
  })

  it("handles each loop with array of objects", () => {
    const html = "{{#each items}}<li>{{name}}:{{val}}</li>{{/each}}"
    const result = renderTemplate(html, {
      items: [{ name: "a", val: "1" }, { name: "b", val: "2" }]
    })
    expect(result).toBe("<li>a:1</li><li>b:2</li>")
  })

  it("handles each loop with array of strings", () => {
    const html = "{{#each items}}<span>{{this}}</span>{{/each}}"
    const result = renderTemplate(html, {
      items: ["x", "y"]
    })
    expect(result).toBe("<span>x</span><span>y</span>")
  })

  it("handles each loop with array of primitives (number)", () => {
    const html = "{{#each nums}}<b>{{this}}</b>{{/each}}"
    const result = renderTemplate(html, { nums: [1, 2, 3] })
    expect(result).toBe("<b>1</b><b>2</b><b>3</b>")
  })

  it("handles conditional block when value is truthy", () => {
    const html = "{{#if show}}<p>visible</p>{{/if}}"
    const result = renderTemplate(html, { show: true })
    expect(result).toBe("<p>visible</p>")
  })

  it("removes conditional block when value is falsy", () => {
    const html = "{{#if show}}<p>visible</p>{{/if}}"
    const result = renderTemplate(html, { show: false })
    expect(result).toBe("")
  })

  it("removes conditional block when value is empty array", () => {
    const html = "{{#if items}}<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>{{/if}}"
    const result = renderTemplate(html, { items: [] })
    expect(result).toBe("")
  })

  it("handles nested each", () => {
    const html = "{{#each groups}}<h2>{{label}}</h2>{{#each cases}}<p>{{title}}</p>{{/each}}{{/each}}"
    const result = renderTemplate(html, {
      groups: [
        { label: "A", cases: [{ title: "T1" }, { title: "T2" }] },
        { label: "B", cases: [{ title: "T3" }] },
      ]
    })
    expect(result).toBe("<h2>A</h2><p>T1</p><p>T2</p><h2>B</h2><p>T3</p>")
  })

  it("preserves unmatched placeholders", () => {
    const html = "<span>{{unknown}}</span>"
    const result = renderTemplate(html, {})
    expect(result).toBe("<span>{{unknown}}</span>")
  })

  it("escapes HTML in values by default", () => {
    const html = "<div>{{text}}</div>"
    const result = renderTemplate(html, { text: "<script>alert('xss')</script>" })
    expect(result).not.toContain("<script>")
    expect(result).toContain("&lt;script&gt;")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: All 11 tests FAIL

- [ ] **Step 3: 实现 engine.ts**

```ts
export function renderTemplate(
  template: string,
  data: Record<string, any>
): string {
  let result = template

  // {{#each items}}...{{/each}} 循环（必须在普通替换之前处理）
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key: string, inner: string) => {
      const items = data[key]
      if (!Array.isArray(items)) return ""
      return items
        .map((item: any) => {
          // 对数组元素，用当前 item 作为上下文替换 inner content
          return inner.replace(/\{\{(\w+)\}\}/g, (_m: string, prop: string) => {
            if (prop === "this") return escapeHtml(String(item))
            return escapeHtml(String(item[prop] ?? ""))
          })
        })
        .join("")
    }
  )

  // {{#if key}}...{{/if}} 条件块
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key: string, inner: string) => {
      const val = data[key]
      if (!val) return ""
      if (Array.isArray(val) && val.length === 0) return ""
      return inner
    }
  )

  // {{key}} 简单占位符（不在 each/if 内部已处理的）
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key]
    if (val === undefined || val === null) return `{{${key}}}`
    return escapeHtml(String(val))
  })

  return result
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/reporter/src/templates/engine.ts scripts/reporter/src/__tests__/templates.test.ts
git commit -m "feat: add template engine with each/if/escape support"
```

---

### Task 8: HTML 模板 — Top3（今日榜单）

**文件:**
- Create: `scripts/reporter/src/templates/html/top3.html`
- Create: `scripts/reporter/src/templates/top3.ts`

- [ ] **Step 1: 写模板测试**

```ts
// 追加到 templates.test.ts
import { renderTop3 } from "../templates/top3.js"
import type { Top3Context, Top3Case } from "../types.js"

describe("renderTop3", () => {
  const createCase = (overrides: Partial<Top3Case> = {}): Top3Case => ({
    id: "100001",
    rank: 1,
    title: "测试案例",
    summary: "这是一个测试案例的摘要",
    score_total: 8,
    cost: "零成本",
    expected_revenue: "月入3000+",
    cycle: "2周启动",
    suitable_for: "上班族",
    source_account: "测试账号",
    tags: ["副业", "低门槛", "月入", "实操", "新手"],
    ...overrides,
  })

  it("renders top3 HTML with 3 cases", () => {
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [
        createCase({ rank: 1, title: "案例一", score_total: 9 }),
        createCase({ rank: 2, title: "案例二", score_total: 7 }),
        createCase({ rank: 3, title: "案例三", score_total: 6 }),
      ],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("案例一")
    expect(html).toContain("案例二")
    expect(html).toContain("案例三")
    expect(html).toContain("2026-05-26")
    expect(html).toContain("今日 Top 3")
  })

  it("includes income tier encoding for high income", () => {
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createCase({ rank: 1, expected_revenue: "月入5000+" })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("月入5000+")
    expect(html).toContain("income-high")
  })

  it("handles zero-cost items with green badge class", () => {
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createCase({ rank: 1, cost: "零成本" })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("零成本")
    expect(html).toContain("cost-zero")
  })

  it("handles long titles with line-clamp", () => {
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createCase({ rank: 1, title: "这是一个非常长的标题用来测试换行截断效果可能超过两行".repeat(3) })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("line-clamp")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: Top3 测试全部 FAIL

- [ ] **Step 3: 创建 top3.html 模板**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, height=1440">
<style>
  @font-face { font-family:'Noto Serif SC'; src:url('{{fontSerif}}') format('woff2'); font-weight:700; }
  @font-face { font-family:'Noto Sans SC'; src:url('{{fontSans}}') format('woff2'); font-weight:400; }
  @font-face { font-family:'Noto Sans SC'; src:url('{{fontSans}}') format('woff2'); font-weight:600; }
  @font-face { font-family:'Roboto Mono'; src:url('{{fontMono}}') format('woff2'); font-weight:700; }

  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; height:1440px; background:#FFFFFF;
    font-family:'Noto Sans SC',sans-serif; color:#1A1A2E;
  }

  .banner {
    background:#2D2D3F; color:#FFFFFF; padding:32px 48px;
    display:flex; justify-content:space-between; align-items:center;
  }
  .banner-title { font-family:'Noto Serif SC',serif; font-size:48px; font-weight:700; }
  .banner-date { font-size:21px; opacity:0.8; }

  .content { padding:40px 48px 120px; }

  .card {
    background:#FFFFFF; border:1px solid #EBE7E0; border-radius:16px;
    margin-bottom:24px; padding:28px; display:flex; gap:24px;
    position:relative;
  }
  .card:last-child { margin-bottom:0; }
  .card::after {
    content:''; position:absolute; bottom:-12px; left:10%; right:10%;
    height:1px;
    background:linear-gradient(90deg,transparent,#EBE7E0 20%,#EBE7E0 80%,transparent);
  }
  .card:last-child::after { display:none; }

  .card-left { flex:0 0 45%; display:flex; flex-direction:column; gap:12px; }
  .card-right { flex:1; display:flex; flex-direction:column; gap:12px; align-items:flex-end; }

  .rank-badge {
    width:56px; height:56px; border-radius:50%; display:flex;
    align-items:center; justify-content:center; flex-shrink:0;
  }
  .rank-1 { background:linear-gradient(135deg,#FBBF24,#F97316); }
  .rank-2 { background:linear-gradient(135deg,#94A3B8,#64748B); }
  .rank-3 { background:linear-gradient(135deg,#D4A574,#B8956C); }
  .rank-num { font-family:'Roboto Mono',monospace; font-size:28px; font-weight:700; color:#FFF; }

  .card-title {
    font-family:'Noto Serif SC',serif; font-size:32px; font-weight:700;
    line-height:1.3; display:-webkit-box; -webkit-line-clamp:2;
    -webkit-box-orient:vertical; overflow:hidden;
  }

  .card-summary { font-size:21px; color:#635D59; line-height:1.5; }

  .card-source { font-size:18px; color:#595959; }

  .score-badge {
    background:linear-gradient(135deg,#F5A623,#FF8C00);
    color:#FFF; border-radius:20px; padding:8px 16px;
    font-family:'Roboto Mono',monospace; font-size:68px; font-weight:700;
    line-height:1;
  }
  .score-label { font-size:21px; color:#595959; margin-top:4px; }

  .decision-row {
    display:flex; gap:12px; flex-wrap:wrap; justify-content:flex-end;
  }
  .decision-tag {
    padding:6px 14px; border-radius:9999px; font-size:18px; font-weight:600;
  }
  .tag-cost-zero { background:#DCFCE7; color:#166534; }
  .tag-cost { background:#F3F4F6; color:#374151; }
  .tag-income-high { background:#FEF3C7; color:#92400E; }
  .tag-income-mid { background:#F3F4F6; color:#4B5563; }
  .tag-income-low { color:#6B7280; }
  .tag-cycle, .tag-suit { background:#DBEAFE; color:#1E40AF; }

  .tags-row { display:flex; gap:8px; flex-wrap:wrap; }
  .tag {
    padding:4px 12px; border-radius:9999px; font-size:18px; font-weight:600;
  }
  .tag-mor-0 { background:#E8D5C4; color:#5D4E37; }
  .tag-mor-1 { background:#D4E2D4; color:#3D5C3D; }
  .tag-mor-2 { background:#D5D4E2; color:#4A4D6E; }
  .tag-mor-3 { background:#E2D4D5; color:#6E4A4D; }
  .tag-mor-4 { background:#DFDBD0; color:#5C5A4F; }

  .trendbar {
    display:flex; align-items:flex-end; gap:3px; height:28px; margin-top:8px;
  }
  .trendbar-dot {
    width:6px; border-radius:3px; background:#E94560;
  }
</style>
</head>
<body>
<div class="banner">
  <div class="banner-title">精益副业案例库</div>
  <div class="banner-date">{{date}} · 今日 Top 3</div>
</div>
<div class="content">
{{#each cases}}
<div class="card">
  <div class="card-left">
    <div class="rank-badge rank-{{rank}}">
      <span class="rank-num">{{rank}}</span>
    </div>
    <div class="card-title">{{title}}</div>
    <div class="card-summary">{{summary}}</div>
    <div class="card-source">—— {{source_account}}</div>
  </div>
  <div class="card-right">
    <div class="score-badge">★{{score_total}}</div>
    <div class="score-label">AI 综合评分</div>
    {{#if isHighIncome}}<div class="decision-row">
      <span class="decision-tag {{costClass}}">{{cost}}</span>
      <span class="decision-tag {{incomeClass}}">{{expected_revenue}}</span>
      <span class="decision-tag tag-cycle">{{cycle}}</span>
      <span class="decision-tag tag-suit">{{suitable_for}}</span>
    </div>{{/if}}
    {{#if isNotHighIncome}}<div class="decision-row">
      <span class="decision-tag {{costClass}}">{{cost}}</span>
      <span class="decision-tag {{incomeClass}}">{{expected_revenue}}</span>
      <span class="decision-tag tag-cycle">{{cycle}}</span>
      <span class="decision-tag tag-suit">{{suitable_for}}</span>
    </div>{{/if}}
    <div class="tags-row">
      {{#each tags}}<span class="tag tag-mor-{{this}}">{{this}}</span>{{/each}}
    </div>
  </div>
</div>
{{/each}}
</div>
</body>
</html>
```

- [ ] **Step 4: 实现 top3.ts 数据转换 + 渲染**

```ts
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { Top3Context, Top3Case } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "top3.html")

const INCOME_THRESHOLD_HIGH = 3000
const INCOME_THRESHOLD_MID = 1000

function parseIncomeAmount(rev: string): number {
  const match = rev.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function getIncomeTier(rev: string): string {
  const amount = parseIncomeAmount(rev)
  if (amount >= INCOME_THRESHOLD_HIGH) return "high"
  if (amount >= INCOME_THRESHOLD_MID) return "mid"
  return "low"
}

function getCostClass(cost: string): string {
  if (cost.includes("零成本") || cost.includes("0")) return "tag-cost-zero"
  return "tag-cost"
}

function getIncomeClass(rev: string): string {
  const tier = getIncomeTier(rev)
  if (tier === "high") return "tag-income-high"
  if (tier === "mid") return "tag-income-mid"
  return "tag-income-low"
}

export function renderTop3(ctx: Top3Context): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const cases = ctx.cases.map((c) => ({
    ...c,
    costClass: getCostClass(c.cost),
    incomeClass: getIncomeClass(c.expected_revenue),
    isHighIncome: getIncomeTier(c.expected_revenue) === "high",
    isNotHighIncome: getIncomeTier(c.expected_revenue) !== "high",
  }))

  return renderTemplate(template, {
    fontSerif: `file:///${resolve(config.FONTS_DIR, "NotoSerifSC-Bold.woff2").replace(/\\/g, "/")}`,
    fontSans: `file:///${resolve(config.FONTS_DIR, "NotoSansSC-Regular.woff2").replace(/\\/g, "/")}`,
    fontMono: `file:///${resolve(config.FONTS_DIR, "RobotoMono-Bold.woff2").replace(/\\/g, "/")}`,
    date: ctx.date,
    cases: cases.map((c, i) => ({ ...c, rank: i + 1 })),
  })
}
```

- [ ] **Step 5: 纠正测试中 top3.ts 的函数定义后，运行测试**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: Top3 测试全部 PASS（其他模板测试暂时失败是正常的）

- [ ] **Step 6: Commit**

```bash
git add scripts/reporter/src/templates/
git commit -m "feat: add Top3 HTML template and data transformer"
```

---

### Task 9: HTML 模板 — Case Detail（案例详情）

**文件:**
- Create: `scripts/reporter/src/templates/html/case-detail.html`
- Create: `scripts/reporter/src/templates/case-detail.ts`

- [ ] **Step 1: 写失败测试（追加到 templates.test.ts）**

```ts
import { renderCaseDetail } from "../templates/case-detail.js"
import type { CaseDetailContext } from "../types.js"

describe("renderCaseDetail", () => {
  const baseCtx: CaseDetailContext = {
    title: "测试案例",
    source_account: "测试来源",
    score_total: 8,
    score_feasibility: 2,
    score_profit: 2,
    score_timeliness: 2,
    score_detail: 1,
    score_fitness: 1,
    summary: "这是一个测试摘要",
    case_story: "这是一个测试案例故事，内容较长。",
    steps: ["步骤一", "步骤二", "步骤三"],
    tools: [{ name: "工具A", desc: "描述A" }, { name: "工具B", desc: "描述B" }],
    pitfalls: "注意风险",
    risk_tags: ["时间成本", "竞争激烈"],
    cost: "零成本",
    expected_revenue: "月入5000+",
    cycle: "2周",
    suitable_for: "上班族",
  }

  it("renders case detail with all sections", () => {
    const html = renderCaseDetail(baseCtx)
    expect(html).toContain("测试案例")
    expect(html).toContain("测试来源")
    expect(html).toContain("★8")
    expect(html).toContain("步骤一")
    expect(html).toContain("工具A")
    expect(html).toContain("注意风险")
    expect(html).toContain("时间成本")
    expect(html).toContain("收入分级强调")
  })

  it("shows decision summary strip at top", () => {
    const html = renderCaseDetail(baseCtx)
    expect(html).toContain("零成本")
    expect(html).toContain("月入5000+")
    expect(html).toContain("2周")
    expect(html).toContain("上班族")
  })

  it("hides pitfalls section when empty", () => {
    const ctx = { ...baseCtx, pitfalls: "", risk_tags: [] }
    const html = renderCaseDetail(ctx)
    expect(html).not.toContain("pitfalls-section")
  })

  it("handles long story with minimum height", () => {
    const ctx = { ...baseCtx, case_story: "短" }
    const html = renderCaseDetail(ctx)
    expect(html).toContain("min-height:120px")
  })

  it("handles many steps with view more link", () => {
    const ctx = {
      ...baseCtx,
      steps: Array.from({ length: 12 }, (_, i) => `步骤${i + 1}`),
    }
    const html = renderCaseDetail(ctx)
    expect(html).toContain("查看全部")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/templates.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: Case Detail 测试全部 FAIL

- [ ] **Step 3: 创建 case-detail.html 模板**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, height=1440">
<style>
  @font-face { font-family:'Noto Serif SC'; src:url('{{fontSerif}}') format('woff2'); font-weight:700; }
  @font-face { font-family:'Noto Sans SC'; src:url('{{fontSans}}') format('woff2'); font-weight:400; }
  @font-face { font-family:'Noto Sans SC'; src:url('{{fontSans}}') format('woff2'); font-weight:600; }
  @font-face { font-family:'Roboto Mono'; src:url('{{fontMono}}') format('woff2'); font-weight:700; }

  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; background:#FFFFFF;
    font-family:'Noto Sans SC',sans-serif; color:#1A1A2E; padding-bottom:120px;
  }

  .banner {
    background:#2D2D3F; color:#FFFFFF; padding:32px 48px;
    display:flex; justify-content:space-between; align-items:center;
  }
  .banner-title { font-family:'Noto Serif SC',serif; font-size:48px; font-weight:700; }
  .banner-sub { font-size:21px; opacity:0.8; }

  .content { padding:40px 48px; }

  .header-row { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; margin-bottom:16px; }
  .header-left { flex:1; }
  .title { font-family:'Noto Serif SC',serif; font-size:32px; font-weight:700; line-height:1.3; }
  .source { font-size:21px; color:#595959; margin-top:8px; }

  .score-badge {
    background:linear-gradient(135deg,#F5A623,#FF8C00); color:#FFF;
    border-radius:20px; padding:10px 18px;
    font-family:'Roboto Mono',monospace; font-size:68px; font-weight:700; line-height:1;
    flex-shrink:0;
  }

  .decision-strip {
    display:flex; gap:12px; margin-bottom:24px; padding:14px 0;
    border-top:1px solid #EBE7E0; border-bottom:1px solid #EBE7E0;
  }
  .decision-item { padding:6px 14px; border-radius:9999px; font-size:20px; font-weight:600; }
  .dc-zerocost { background:#DCFCE7; color:#166534; }
  .dc-revenue-high { background:#FEF3C7; color:#92400E; font-weight:700; }
  .dc-revenue-mid { background:#F3F4F6; color:#4B5563; }
  .dc-revenue-low { color:#6B7280; }
  .dc-cycle { background:#DBEAFE; color:#1E40AF; }
  .dc-suit { background:#FCE7F3; color:#9D174D; }

  .positioning-line { font-size:16px; color:#595959; margin-bottom:20px; }

  .dimensions { display:flex; flex-direction:column; gap:8px; margin-bottom:24px; }
  .dim-row { display:flex; align-items:center; gap:12px; }
  .dim-label { width:80px; font-size:18px; color:#595959; }
  .dim-bar { flex:1; height:12px; background:#E8E6E1; border-radius:6px; overflow:hidden; }
  .dim-fill { height:100%; border-radius:6px; }
  .dim-fill-fea { background:#E94560; }
  .dim-fill-pro { background:#F5A623; }
  .dim-fill-tim { background:#059669; }
  .dim-fill-det { background:#2563EB; }
  .dim-fill-fit { background:#7C3AED; }
  .dim-score { font-family:'Roboto Mono',monospace; font-size:18px; font-weight:700; width:40px; text-align:right; }

  .section { margin-bottom:28px; }
  .section-title { font-size:24px; font-weight:600; margin-bottom:16px; color:#1A1A2E; }

  .story { font-size:21px; line-height:1.8; color:#635D59; min-height:120px; }

  .step-list { display:flex; flex-direction:column; gap:10px; }
  .step-item { display:flex; gap:12px; align-items:flex-start; font-size:21px; }
  .step-num { flex-shrink:0; width:32px; height:32px; background:#E94560; color:#FFF; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Roboto Mono',monospace; font-size:18px; font-weight:700; }
  .step-text { line-height:1.6; padding-top:3px; }

  .view-more { font-size:16px; color:#2563EB; cursor:pointer; margin-top:8px; }

  .tools-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .tool-card { background:#FAFAFA; border:1px solid #EBE7E0; border-radius:12px; padding:14px 16px; }
  .tool-name { font-size:20px; font-weight:600; margin-bottom:4px; }
  .tool-desc { font-size:18px; color:#635D59; }

  .pitfalls-section { display:flex; gap:12px; align-items:flex-start; }
  .pitfalls-section .warning-icon { font-size:24px; flex-shrink:0; }
  .pitfalls-text { font-size:21px; color:#635D59; line-height:1.5; }
  .risk-tags { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  .risk-tag { padding:4px 12px; border-radius:9999px; font-size:18px; font-weight:600; background:#FCE7F3; color:#9D174D; }

  .bottom-strip { display:flex; gap:12px; padding:0 48px 20px; }
</style>
</head>
<body>
<div class="banner">
  <div class="banner-title">精益副业案例库</div>
  <div class="banner-sub">案例深度解析</div>
</div>
<div class="content">
  <div class="header-row">
    <div class="header-left">
      <div class="title">{{title}}</div>
      <div class="source">—— {{source_account}}</div>
    </div>
    <div class="score-badge">★{{score_total}}</div>
  </div>

  <div class="decision-strip">
    <span class="decision-item {{costClass}}">{{cost}}</span>
    <span class="decision-item {{incomeClass}}">{{expected_revenue}}</span>
    <span class="decision-item dc-cycle">{{cycle}}</span>
    <span class="decision-item dc-suit">{{suitable_for}}</span>
  </div>

  <div class="positioning-line">{{positioning}}</div>

  <div class="dimensions">
    {{#each dimensions}}<div class="dim-row">
      <span class="dim-label">{{label}}</span>
      <div class="dim-bar"><div class="dim-fill dim-fill-{{key}}" style="width:{{pct}}%"></div></div>
      <span class="dim-score">{{score}}/{{max}}</span>
    </div>{{/each}}
  </div>

  <div class="section">
    <div class="section-title">案例故事</div>
    <div class="story">{{case_story}}</div>
  </div>

  <div class="section">
    <div class="section-title">操作步骤</div>
    <div class="step-list">
      {{#each steps}}<div class="step-item">
        <div class="step-num">{{num}}</div>
        <div class="step-text">{{text}}</div>
      </div>{{/each}}
    </div>
    {{#if showViewMore}}<div class="view-more">▸ 查看全部 {{totalSteps}} 步</div>{{/if}}
  </div>

  {{#if hasTools}}<div class="section">
    <div class="section-title">所需工具</div>
    <div class="tools-grid">
      {{#each tools}}<div class="tool-card">
        <div class="tool-name">{{name}}</div>
        <div class="tool-desc">{{desc}}</div>
      </div>{{/each}}
    </div>
  </div>{{/if}}

  {{#if hasPitfalls}}<div class="section pitfalls-section">
    <div class="warning-icon">⚠</div>
    <div>
      <div class="section-title" style="margin-bottom:8px">避坑指南</div>
      <div class="pitfalls-text">{{pitfalls}}</div>
      {{#if hasRiskTags}}<div class="risk-tags">
        {{#each risk_tags}}<span class="risk-tag">{{this}}</span>{{/each}}
      </div>{{/if}}
    </div>
  </div>{{/if}}
</div>

<div class="bottom-strip">
  <span class="decision-item {{costClass}}">{{cost}}</span>
  <span class="decision-item {{incomeClass}}">{{expected_revenue}}</span>
  <span class="decision-item dc-cycle">{{cycle}}</span>
  <span class="decision-item dc-suit">{{suitable_for}}</span>
</div>
</body>
</html>
```

- [ ] **Step 4: 实现 case-detail.ts**

```ts
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { CaseDetailContext, CaseRecord } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "case-detail.html")

const DIM_META = [
  { key: "fea", label: "可行性", max: 3 },
  { key: "pro", label: "盈利", max: 2 },
  { key: "tim", label: "时效性", max: 2 },
  { key: "det", label: "详实度", max: 2 },
  { key: "fit", label: "适合度", max: 1 },
]

function getIncomeClass(rev: string): string {
  const match = rev.match(/(\d+)/)
  const amount = match ? parseInt(match[1], 10) : 0
  if (amount >= 3000) return "dc-revenue-high"
  if (amount >= 1000) return "dc-revenue-mid"
  return "dc-revenue-low"
}

function getCostClass(cost: string): string {
  return (cost.includes("零成本") || cost.includes("0")) ? "dc-zerocost" : "decision-item"
}

export function caseRecordToContext(record: CaseRecord): CaseDetailContext {
  return {
    title: record.title,
    source_account: record.source_account ?? "",
    score_total: record.score_total,
    score_feasibility: record.score_feasibility,
    score_profit: record.score_profit,
    score_timeliness: record.score_timeliness,
    score_detail: record.score_detail,
    score_fitness: record.score_fitness,
    summary: record.summary ?? "",
    case_story: record.case_story ?? "",
    steps: (record.steps ?? []).map((s) => (typeof s === "string" ? s : s.step)),
    tools: (record.tools ?? []).map((t) =>
      typeof t === "string" ? { name: t, desc: "" } : t
    ),
    pitfalls: record.pitfalls ?? "",
    risk_tags: record.risk_tags ?? [],
    cost: record.cost ?? "未标注",
    expected_revenue: record.expected_revenue ?? "未标注",
    cycle: record.cycle ?? "未标注",
    suitable_for: record.suitable_for ?? "通用",
  }
}

export function renderCaseDetail(ctx: CaseDetailContext): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const scores = [ctx.score_feasibility, ctx.score_profit, ctx.score_timeliness, ctx.score_detail, ctx.score_fitness]
  const maxes = [3, 2, 2, 2, 1]

  const dimensions = DIM_META.map((m, i) => ({
    key: m.key,
    label: m.label,
    score: scores[i],
    max: maxes[i],
    pct: Math.round((scores[i] / maxes[i]) * 100),
  }))

  const steps = ctx.steps.map((text, i) => ({ num: i + 1, text }))
  const showViewMore = ctx.steps.length > 5
  const displaySteps = showViewMore ? steps.slice(0, 5) : steps

  const positioning = ctx.summary || `利用信息差，${ctx.cost}启动的副业实操`

  return renderTemplate(template, {
    fontSerif: `file:///${resolve(config.FONTS_DIR, "NotoSerifSC-Bold.woff2").replace(/\\/g, "/")}`,
    fontSans: `file:///${resolve(config.FONTS_DIR, "NotoSansSC-Regular.woff2").replace(/\\/g, "/")}`,
    fontMono: `file:///${resolve(config.FONTS_DIR, "RobotoMono-Bold.woff2").replace(/\\/g, "/")}`,
    title: ctx.title,
    source_account: ctx.source_account,
    score_total: ctx.score_total,
    cost: ctx.cost,
    expected_revenue: ctx.expected_revenue,
    cycle: ctx.cycle,
    suitable_for: ctx.suitable_for,
    costClass: getCostClass(ctx.cost),
    incomeClass: getIncomeClass(ctx.expected_revenue),
    positioning,
    dimensions,
    case_story: ctx.case_story,
    steps: displaySteps,
    showViewMore,
    totalSteps: ctx.steps.length,
    hasTools: ctx.tools.length > 0,
    tools: ctx.tools,
    hasPitfalls: !!(ctx.pitfalls || ctx.risk_tags.length > 0),
    pitfalls: ctx.pitfalls,
    hasRiskTags: ctx.risk_tags.length > 0,
    risk_tags: ctx.risk_tags,
  })
}
```

- [ ] **Step 5: 运行测试验证通过**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: Case Detail 测试全部 PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/reporter/src/templates/
git commit -m "feat: add Case Detail HTML template and data transformer"
```

---

### Task 10: HTML 模板 — Last 3 Days（近3日榜单）

**文件:**
- Create: `scripts/reporter/src/templates/html/last3days.html`
- Create: `scripts/reporter/src/templates/last3days.ts`

- [ ] **Step 1: 写失败测试（追加到 templates.test.ts）**

```ts
import { renderLast3Days } from "../templates/last3days.js"
import type { Last3DaysContext } from "../types.js"

describe("renderLast3Days", () => {
  it("renders 3 day groups with cases", () => {
    const ctx: Last3DaysContext = {
      days: [
        {
          date: "2026-05-26",
          dayLabel: "DAY 1 · 5月26日 周一",
          cases: [
            { id: "a", rank: 1, title: "案例A", summary: "", score_total: 9, cost: "0", expected_revenue: "月入5000", cycle: "1周", suitable_for: "上班族", source_account: "x", tags: ["t1"] } as any,
          ],
        },
        {
          date: "2026-05-25",
          dayLabel: "DAY 2 · 5月25日 周日",
          cases: [
            { id: "b", rank: 1, title: "案例B", summary: "", score_total: 8, cost: "低", expected_revenue: "月入2000", cycle: "2周", suitable_for: "大学生", source_account: "y", tags: ["t2"] } as any,
          ],
        },
        {
          date: "2026-05-24",
          dayLabel: "DAY 3 · 5月24日 周六",
          cases: [
            { id: "c", rank: 1, title: "案例C", summary: "", score_total: 7, cost: "0", expected_revenue: "月入800", cycle: "1月", suitable_for: "所有人", source_account: "z", tags: ["t3"] } as any,
          ],
        },
      ],
    }
    const html = renderLast3Days(ctx)
    expect(html).toContain("DAY 1")
    expect(html).toContain("DAY 2")
    expect(html).toContain("DAY 3")
    expect(html).toContain("案例A")
    expect(html).toContain("案例B")
    expect(html).toContain("案例C")
  })

  it("shows placeholder for incomplete days", () => {
    const ctx: Last3DaysContext = { days: [] }
    const html = renderLast3Days(ctx)
    expect(html).toContain("每日更新精选案例")
  })

  it("uses zebra striping for case rows", () => {
    const ctx: Last3DaysContext = {
      days: [
        {
          date: "2026-05-26",
          dayLabel: "DAY 1",
          cases: [
            { id: "1", rank: 1, title: "A", summary: "", score_total: 9, cost: "", expected_revenue: "", cycle: "", suitable_for: "", source_account: "", tags: [] } as any,
            { id: "2", rank: 2, title: "B", summary: "", score_total: 8, cost: "", expected_revenue: "", cycle: "", suitable_for: "", source_account: "", tags: [] } as any,
            { id: "3", rank: 3, title: "C", summary: "", score_total: 7, cost: "", expected_revenue: "", cycle: "", suitable_for: "", source_account: "", tags: [] } as any,
          ],
        },
      ],
    }
    const html = renderLast3Days(ctx)
    expect(html).toContain("even")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: Last3Days 测试全部 FAIL

- [ ] **Step 3: 创建 last3days.html 模板**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, height=1440">
<style>
  @font-face { font-family:'Noto Serif SC'; src:url('{{fontSerif}}') format('woff2'); font-weight:700; }
  @font-face { font-family:'Noto Sans SC'; src:url('{{fontSans}}') format('woff2'); font-weight:400; }
  @font-face { font-family:'Noto Sans SC'; src:url('{{fontSans}}') format('woff2'); font-weight:600; }
  @font-face { font-family:'Roboto Mono'; src:url('{{fontMono}}') format('woff2'); font-weight:700; }

  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; background:#FFFFFF; padding-bottom:120px;
    font-family:'Noto Sans SC',sans-serif; color:#1A1A2E;
  }

  .banner {
    background:#2D2D3F; color:#FFFFFF; padding:32px 48px;
    display:flex; justify-content:space-between; align-items:center;
  }
  .banner-title { font-family:'Noto Serif SC',serif; font-size:48px; font-weight:700; }
  .banner-sub { font-size:21px; opacity:0.8; }

  .content { padding:40px 48px; }

  .empty-state { text-align:center; padding:80px 0; color:#595959; }
  .empty-state p { font-size:21px; margin-bottom:16px; }

  .day-group { margin-bottom:48px; }
  .day-header {
    padding:16px 0 12px; border-bottom:2px solid #EBE7E0; margin-bottom:16px;
    display:flex; align-items:center; gap:12px;
  }
  .day-label { font-size:24px; font-weight:600; }

  .case-row {
    display:flex; align-items:center; gap:16px; padding:14px 16px;
    border-radius:8px;
  }
  .case-row.even { background:#FAFAFA; }
  .case-row.odd { background:#FFFFFF; }

  .case-rank {
    width:40px; height:40px; border-radius:50%; display:flex;
    align-items:center; justify-content:center; flex-shrink:0;
    font-family:'Roboto Mono',monospace; font-size:20px; font-weight:700; color:#FFF;
  }
  .rank-gold { background:linear-gradient(135deg,#FBBF24,#F97316); }
  .rank-silver { background:linear-gradient(135deg,#94A3B8,#64748B); }
  .rank-bronze { background:linear-gradient(135deg,#D4A574,#B8956C); }

  .case-title { flex:1; font-size:21px; line-height:1.4; }

  .case-score {
    font-family:'Roboto Mono',monospace; font-size:18px; font-weight:700;
    color:#F5A623;
  }

  .income-tag { padding:4px 10px; border-radius:9999px; font-size:16px; font-weight:600; flex-shrink:0; }
  .income-high-tag { background:#FEF3C7; color:#92400E; }
  .income-mid-tag { background:#F3F4F6; color:#4B5563; }
  .income-low-tag { color:#6B7280; }

  .cost-tag { padding:4px 10px; border-radius:9999px; font-size:16px; font-weight:600; flex-shrink:0; }
  .cost-zero-tag { background:#DCFCE7; color:#166534; }
  .cost-other-tag { background:#F3F4F6; color:#374151; }
</style>
</head>
<body>
<div class="banner">
  <div class="banner-title">精益副业案例库</div>
  <div class="banner-sub">近 3 日精选榜单</div>
</div>
<div class="content">
{{#if hasDays}}
{{#each days}}<div class="day-group">
  <div class="day-header">
    <div class="day-label">{{dayLabel}}</div>
  </div>
  {{#each cases}}<div class="case-row {{rowClass}}">
    <div class="case-rank {{rankClass}}">{{rank}}</div>
    <div class="case-title">{{title}}</div>
    <div class="case-score">★{{score_total}}</div>
    <span class="income-tag {{incomeClass}}">{{expected_revenue}}</span>
    <span class="cost-tag {{costClass}}">{{cost}}</span>
  </div>{{/each}}
</div>{{/each}}
{{else}}
<div class="empty-state">
  <p>每日更新精选案例</p>
  <p style="font-size:18px;color:#9B9A97">更多副业实操，敬请关注精益副业案例库</p>
</div>
{{/if}}
</div>
</body>
</html>
```

- [ ] **Step 4: 实现 last3days.ts**

```ts
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { Last3DaysContext, Top3Case } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "last3days.html")

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function formatDayLabel(dateStr: string, dayNum: number): string {
  const d = new Date(dateStr + "T00:00:00+08:00")
  const weekDay = WEEKDAYS[d.getDay()] ?? ""
  return `DAY ${dayNum} · ${dateStr.substring(5)} ${weekDay}`
}

function getRankClass(rank: number): string {
  if (rank === 1) return "rank-gold"
  if (rank === 2) return "rank-silver"
  if (rank === 3) return "rank-bronze"
  return ""
}

function getIncomeClass(rev: string): string {
  const match = rev.match(/(\d+)/)
  const amount = match ? parseInt(match[1], 10) : 0
  if (amount >= 3000) return "income-high-tag"
  if (amount >= 1000) return "income-mid-tag"
  return "income-low-tag"
}

function getCostClass(cost: string): string {
  return (cost.includes("零成本") || cost.includes("0")) ? "cost-zero-tag" : "cost-other-tag"
}

export function renderLast3Days(ctx: Last3DaysContext): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const days = ctx.days.map((g, di) => ({
    dayLabel: formatDayLabel(g.date, di + 1),
    cases: g.cases.map((c, ci) => ({
      ...c,
      rank: ci + 1,
      rankClass: getRankClass(ci + 1),
      incomeClass: getIncomeClass(c.expected_revenue),
      costClass: getCostClass(c.cost),
      rowClass: ci % 2 === 0 ? "even" : "odd",
    })),
  }))

  return renderTemplate(template, {
    fontSerif: `file:///${resolve(config.FONTS_DIR, "NotoSerifSC-Bold.woff2").replace(/\\/g, "/")}`,
    fontSans: `file:///${resolve(config.FONTS_DIR, "NotoSansSC-Regular.woff2").replace(/\\/g, "/")}`,
    fontMono: `file:///${resolve(config.FONTS_DIR, "RobotoMono-Bold.woff2").replace(/\\/g, "/")}`,
    hasDays: ctx.days.length > 0,
    days,
  })
}
```

- [ ] **Step 5: 运行测试验证通过**

```bash
npx vitest run src/__tests__/templates.test.ts
```

Expected: All template tests PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/reporter/src/templates/
git commit -m "feat: add Last3Days HTML template and data transformer"
```

---

### Task 11: Browser Pool（并发安全）

**文件:**
- Create: `scripts/reporter/src/browser/pool.ts`
- Create: `scripts/reporter/src/__tests__/screenshot.test.ts` (browser pool 部分)

- [ ] **Step 1: 写 BrowserPool 测试**

```ts
// src/__tests__/screenshot.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(),
  },
}))

describe("BrowserPool", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("launches browser once and reuses it", async () => {
    const mockBrowser = { connected: true, on: vi.fn(), close: vi.fn() }
    const puppeteer = await import("puppeteer")
    ;(puppeteer.default.launch as any).mockResolvedValue(mockBrowser)

    const { BrowserPool } = await import("../browser/pool.js")
    const pool = new BrowserPool()

    const b1 = await pool.get()
    const b2 = await pool.get()

    expect(b1).toBe(b2)
    expect(puppeteer.default.launch).toHaveBeenCalledTimes(1)
  })

  it("re-launches after disconnected event", async () => {
    const mockBrowser1 = { connected: true, on: vi.fn(), close: vi.fn() }
    const mockBrowser2 = { connected: true, on: vi.fn(), close: vi.fn() }

    const puppeteer = await import("puppeteer")
    ;(puppeteer.default.launch as any)
      .mockResolvedValueOnce(mockBrowser1)
      .mockResolvedValueOnce(mockBrowser2)

    const { BrowserPool } = await import("../browser/pool.js")
    const pool = new BrowserPool()

    const b1 = await pool.get()
    // Simulate disconnect
    const disconnectHandler = mockBrowser1.on.mock.calls.find(
      ([event]: [string]) => event === "disconnected"
    )?.[1] as Function
    expect(disconnectHandler).toBeDefined()
    disconnectHandler()

    const b2 = await pool.get()
    expect(b2).not.toBe(b1)
    expect(puppeteer.default.launch).toHaveBeenCalledTimes(2)
  })

  it("handles concurrent get() calls with single launch", async () => {
    const mockBrowser = { connected: true, on: vi.fn(), close: vi.fn() }
    const puppeteer = await import("puppeteer")
    ;(puppeteer.default.launch as any).mockResolvedValue(mockBrowser)

    const { BrowserPool } = await import("../browser/pool.js")
    const pool = new BrowserPool()

    const [b1, b2, b3] = await Promise.all([pool.get(), pool.get(), pool.get()])

    expect(b1).toBe(b2)
    expect(b2).toBe(b3)
    expect(puppeteer.default.launch).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/screenshot.test.ts
```

Expected: BrowserPool 测试全部 FAIL

- [ ] **Step 3: 实现 pool.ts**

```ts
import type { Browser } from "puppeteer"
import puppeteer from "puppeteer"

export class BrowserPool {
  private browser: Browser | null = null
  private launchPromise: Promise<Browser> | null = null

  async get(): Promise<Browser> {
    if (this.browser?.connected) return this.browser

    if (!this.launchPromise) {
      this.launchPromise = puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
        ],
      })
    }

    this.browser = await this.launchPromise
    this.browser.on("disconnected", () => {
      this.browser = null
      this.launchPromise = null
    })

    return this.browser
  }

  async close(): Promise<void> {
    await this.browser?.close()
    this.browser = null
    this.launchPromise = null
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/screenshot.test.ts
```

Expected: BrowserPool 测试全部 PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/reporter/src/browser/ scripts/reporter/src/__tests__/screenshot.test.ts
git commit -m "feat: add concurrency-safe BrowserPool singleton"
```

---

### Task 12: 截图管道

**文件:**
- Create: `scripts/reporter/src/browser/screenshot.ts`
- 追加测试到 `scripts/reporter/src/__tests__/screenshot.test.ts`

- [ ] **Step 1: 追加截图管道测试**

```ts
// 追加到 screenshot.test.ts
import { describe, it, expect, vi } from "vitest"

const mockScreenshot = vi.fn().mockResolvedValue(Buffer.from("fake-png-data"))
const mockSetContent = vi.fn()
const mockSetViewport = vi.fn()
const mockEvaluate = vi.fn().mockResolvedValue(1440)
const mockPage = {
  setContent: mockSetContent,
  setViewport: mockSetViewport,
  screenshot: mockScreenshot,
  evaluate: mockEvaluate,
}

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-jpg-data")),
  })),
}))

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

describe("screenshotToFile", () => {
  it("renders HTML and saves as JPEG", async () => {
    const { screenshotToFile } = await import("../browser/screenshot.js")
    const result = await screenshotToFile(
      mockPage as any,
      "<h1>Test</h1>",
      "test-output",
    )
    expect(mockSetContent).toHaveBeenCalledWith("<h1>Test</h1>", expect.any(Object))
    expect(mockScreenshot).toHaveBeenCalled()
    expect(result.path).toContain("test-output")
    expect(result.width).toBe(1080)
    expect(result.height).toBe(1440)
  })

  it("uses dynamic height from scrollHeight", async () => {
    mockEvaluate.mockResolvedValueOnce(2000)
    const { screenshotToFile } = await import("../browser/screenshot.js")
    const result = await screenshotToFile(
      mockPage as any,
      "<h1>Long Content</h1>",
      "test-dynamic",
    )
    expect(result.height).toBe(2000)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/screenshot.test.ts
```

Expected: screenshot 测试全部 FAIL

- [ ] **Step 3: 实现 screenshot.ts**

```ts
import type { Page } from "puppeteer"
import sharp from "sharp"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { config } from "../config.js"
import type { ScreenshotResult } from "../types.js"

const VIEWPORT_WIDTH = 1080
const DEFAULT_HEIGHT = 1440
const DEVICE_SCALE_FACTOR = 2

export async function screenshotToFile(
  page: Page,
  html: string,
  filename: string,
): Promise<ScreenshotResult> {
  await page.setContent(html, {
    waitUntil: "networkidle0",
  })

  // 等待字体和布局完成
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))
  })

  const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
  const captureHeight = Math.max(DEFAULT_HEIGHT, bodyHeight)

  await page.setViewport({
    width: VIEWPORT_WIDTH,
    height: captureHeight,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  })

  const pngBuffer = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: captureHeight },
  })

  const outPath = resolve(config.OUTPUT_DIR, `${filename}.jpg`)
  let jpegBuffer: Buffer

  try {
    jpegBuffer = await sharp(pngBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()
  } catch {
    // sharp 失败时 fallback 为原始 PNG
    console.warn("sharp 压缩失败，使用 PNG 格式")
    jpegBuffer = pngBuffer
  }

  await writeFile(outPath, jpegBuffer)

  return {
    path: outPath,
    width: VIEWPORT_WIDTH,
    height: captureHeight,
    sizeBytes: jpegBuffer.length,
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/screenshot.test.ts
```

Expected: 所有 screenshot 测试 PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/reporter/src/browser/screenshot.ts scripts/reporter/src/__tests__/screenshot.test.ts
git commit -m "feat: add HTML-to-JPEG screenshot pipeline with sharp compression"
```

---

### Task 13: 主流程编排

**文件:**
- Create: `scripts/reporter/src/lib/report.ts`
- Create: `scripts/reporter/src/__tests__/report.test.ts`

- [ ] **Step 1: 写集成测试**

```ts
// src/__tests__/report.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../cloudbase.js", () => ({
  getDatabase: vi.fn(),
}))
vi.mock("../browser/pool.js", () => ({
  BrowserPool: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn(),
        setViewport: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(1440),
        screenshot: vi.fn().mockResolvedValue(Buffer.from("fake")),
        close: vi.fn(),
      }),
    }),
    close: vi.fn(),
  })),
}))
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFileSync: vi.fn().mockReturnValue("<html>{{content}}</html>"),
}))
vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake")),
  })),
}))

describe("generateDailyReport", () => {
  it("throws when DailyPick has no data for today", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ data: [] }),
      }),
      command: {},
    }
    ;(getDatabase as any).mockReturnValue({ database: () => mockDb })

    const { generateDailyReport } = await import("../lib/report.js")
    await expect(generateDailyReport("2026-01-01")).rejects.toThrow("No daily pick")
  })

  it("generates top3 screenshot when pick exists", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    const casesData = [
      { _id: "1", id: "100001", title: "案例1", score_total: 9, cost: "零成本", expected_revenue: "月入5000+", cycle: "1周", suitable_for: "上班族", source_account: "x", tags: ["a","b","c","d","e"], summary: "sum", status: "published", score_feasibility: 2, score_profit: 2, score_timeliness: 2, score_detail: 1, score_fitness: 1 },
    ]

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "DailyPick") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ data: [{ date: "2026-01-01", case_ids: ["100001"] }] }),
            orderBy: vi.fn().mockReturnThis(),
          }
        }
        if (name === "Case") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ data: casesData }),
          }
        }
        return { where: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ data: [] }) }
      }),
      command: { in: vi.fn((arr: string[]) => arr) },
    }
    ;(getDatabase as any).mockReturnValue({ database: () => mockDb })

    const { generateDailyReport } = await import("../lib/report.js")
    const results = await generateDailyReport("2026-01-01")
    expect(results.top3).toBeDefined()
    expect(results.top3!.path).toContain("top3")
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/__tests__/report.test.ts
```

Expected: 全部 FAIL

- [ ] **Step 3: 实现 report.ts**

```ts
import "dotenv/config"
import { getDatabase } from "../cloudbase.js"
import { fetchDailyPick, fetchRecentPicks } from "../data/daily-pick.js"
import { fetchCasesByIds, fetchCaseById } from "../data/case.js"
import { renderTop3 } from "../templates/top3.js"
import { renderCaseDetail, caseRecordToContext } from "../templates/case-detail.js"
import { renderLast3Days } from "../templates/last3days.js"
import { BrowserPool } from "../browser/pool.js"
import { screenshotToFile } from "../browser/screenshot.js"
import { ensureOutputDir } from "../config.js"
import type { Top3Context, Last3DaysContext, Top3Case, DayGroup, ScreenshotResult, CaseRecord } from "../types.js"

export interface ReportResults {
  top3?: ScreenshotResult
  caseDetail?: ScreenshotResult
  last3Days?: ScreenshotResult
}

function buildTop3Case(record: CaseRecord, rank: number): Top3Case {
  return {
    id: record.id,
    rank,
    title: record.title,
    summary: record.summary ?? "",
    score_total: record.score_total,
    cost: record.cost ?? "未标注",
    expected_revenue: record.expected_revenue ?? "未标注",
    cycle: record.cycle ?? "未标注",
    suitable_for: record.suitable_for ?? "通用",
    source_account: record.source_account ?? "",
    tags: record.tags ?? [],
  }
}

/** 生成今日 Top3 图片 */
export async function generateDailyReport(date: string): Promise<ReportResults> {
  ensureOutputDir()
  const db = getDatabase()

  const pick = await fetchDailyPick(db, date)
  if (!pick) throw new Error(`No daily pick found for ${date}`)

  const allCases = await fetchCasesByIds(db, pick.case_ids)
  const caseMap = new Map(allCases.map((c) => [c.id, c]))
  const orderedCases = pick.case_ids
    .map((id) => caseMap.get(id))
    .filter((c): c is CaseRecord => !!c)

  const pool = new BrowserPool()
  const browser = await pool.get()
  const page = await browser.newPage()

  const results: ReportResults = {}

  try {
    // HTML-1: 今日 Top3
    const top3Ctx: Top3Context = {
      date: pick.date,
      cases: orderedCases.map((c, i) => buildTop3Case(c, i + 1)),
    }
    const top3Html = renderTop3(top3Ctx)
    results.top3 = await screenshotToFile(page, top3Html, "top3")

    // HTML-2: 案例详情（取第一个案例）
    if (orderedCases.length > 0) {
      const detailCtx = caseRecordToContext(orderedCases[0])
      const detailHtml = renderCaseDetail(detailCtx)
      results.caseDetail = await screenshotToFile(page, detailHtml, "case-detail")
    }

    // HTML-3: 近 3 日榜单
    const recentPicks = await fetchRecentPicks(db, 3)
    if (recentPicks.length > 0) {
      const dayGroups: DayGroup[] = []
      for (const rp of recentPicks) {
        const dayCases = await fetchCasesByIds(db, rp.case_ids)
        const dayCaseMap = new Map(dayCases.map((c) => [c.id, c]))
        const orderedDayCases = rp.case_ids
          .map((id) => dayCaseMap.get(id))
          .filter((c): c is CaseRecord => !!c)

        dayGroups.push({
          date: rp.date,
          dayLabel: "", // 将在 renderLast3Days 中生成
          cases: orderedDayCases.map((c, i) => buildTop3Case(c, i + 1)),
        })
      }
      const last3Ctx: Last3DaysContext = { days: dayGroups }
      const last3Html = renderLast3Days(last3Ctx)
      results.last3Days = await screenshotToFile(page, last3Html, "last3days")
    }
  } finally {
    await page.close()
  }

  return results
}

/** 生成单个案例详情图片 */
export async function generateCaseDetailReport(caseId: string): Promise<ScreenshotResult> {
  ensureOutputDir()
  const db = getDatabase()

  const record = await fetchCaseById(db, caseId)
  if (!record) throw new Error(`Case not found: ${caseId}`)

  const pool = new BrowserPool()
  const browser = await pool.get()
  const page = await browser.newPage()

  try {
    const ctx = caseRecordToContext(record)
    const html = renderCaseDetail(ctx)
    return await screenshotToFile(page, html, `case-detail-${caseId}`)
  } finally {
    await page.close()
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/__tests__/report.test.ts
```

Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/reporter/src/lib/ scripts/reporter/src/__tests__/report.test.ts
git commit -m "feat: add report orchestrator with daily/single modes"
```

---

### Task 14: CLI 入口

**文件:**
- Create: `scripts/reporter/src/index.ts`

- [ ] **Step 1: 实现 CLI**

```ts
#!/usr/bin/env node
import "dotenv/config"
import { generateDailyReport, generateCaseDetailReport } from "./lib/report.js"
import { config, ensureOutputDir } from "./config.js"

const VALID_COMMANDS = ["daily", "single", "recent", "all"]

function showHelp(): void {
  console.log(`Usage: npx tsx src/index.ts <command> [options]

Commands:
  daily [date]           Generate today's Top3 overview (HTML-1)
  single --id <caseId>   Generate case detail image (HTML-2)
  recent                 Generate last 3 days rankings (HTML-3)
  all                    Generate all three images

Options:
  --id <caseId>          Case ID for single command
  --help                 Show this help

Examples:
  npx tsx src/index.ts daily
  npx tsx src/index.ts daily 2026-05-25
  npx tsx src/index.ts single --id 100001
  npx tsx src/index.ts all
`)
}

async function main() {
  ensureOutputDir()

  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === "--help" || !VALID_COMMANDS.includes(command)) {
    showHelp()
    process.exit(command === "--help" ? 0 : 1)
  }

  const caseIdIndex = args.indexOf("--id")
  const caseId = caseIdIndex !== -1 ? args[caseIdIndex + 1] : null

  try {
    switch (command) {
      case "daily": {
        const date = caseId || new Date().toISOString().slice(0, 10)
        console.log(`生成今日 Top3 (${date})...`)
        const results = await generateDailyReport(date)
        console.log(`✓ Top3: ${results.top3?.path}`)
        if (results.caseDetail) console.log(`✓ 案例详情: ${results.caseDetail?.path}`)
        if (results.last3Days) console.log(`✓ 近3日: ${results.last3Days?.path}`)
        break
      }
      case "single": {
        if (!caseId) {
          console.error("错误: --id 参数必须指定")
          process.exit(1)
        }
        console.log(`生成案例详情 (${caseId})...`)
        const result = await generateCaseDetailReport(caseId)
        console.log(`✓ 案例详情: ${result.path}`)
        break
      }
      case "recent": {
        const today = new Date().toISOString().slice(0, 10)
        console.log(`生成近3日榜单...`)
        const results = await generateDailyReport(today)
        if (results.last3Days) {
          console.log(`✓ 近3日: ${results.last3Days?.path}`)
        }
        break
      }
      case "all": {
        const today = new Date().toISOString().slice(0, 10)
        console.log(`生成全部3张图片 (${today})...`)
        const results = await generateDailyReport(today)
        console.log(`✓ Top3: ${results.top3?.path}`)
        console.log(`✓ 案例详情: ${results.caseDetail?.path}`)
        console.log(`✓ 近3日: ${results.last3Days?.path}`)
        break
      }
    }
  } catch (err: any) {
    console.error(`错误: ${err.message}`)
    process.exit(1)
  }

  // 优雅关闭（给 Puppeteer 清理时间）
  process.exit(0)
}

main()
```

- [ ] **Step 2: 验证 CLI 帮助**

```bash
cd scripts/reporter && npx tsx src/index.ts --help
```

Expected: 帮助信息输出

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add scripts/reporter/src/index.ts
git commit -m "feat: add CLI entry with daily/single/recent/all commands"
```

---

### Task 15: 字体文件下载

**文件:**
- Create: `scripts/reporter/fonts/` (目录)
- Download: 3 个 woff2 字体文件

- [ ] **Step 1: 创建字体目录**

```bash
mkdir -p scripts/reporter/fonts
```

- [ ] **Step 2: 下载字体文件**

使用 Google Fonts CDN 下载 woff2 格式字体：

```bash
# Noto Serif SC Bold (标题)
curl -L "https://fonts.google.com/download?family=Noto+Serif+SC" -o scripts/reporter/fonts/NotoSerifSC-Bold.woff2

# Noto Sans SC Regular (正文)
curl -L "https://fonts.google.com/download?family=Noto+Sans+SC" -o scripts/reporter/fonts/NotoSansSC-Regular.woff2

# Roboto Mono Bold (数字)
curl -L "https://fonts.google.com/download?family=Roboto+Mono" -o scripts/reporter/fonts/RobotoMono-Bold.woff2
```

> 注意：Google Fonts 的 `download` API 返回 zip 包。需要解压后提取对应字重的 woff2 文件并重命名。备选方案：使用 `@fontsource` npm 包或 `google-font-downloader` 工具。

- [ ] **Step 3: 验证字体文件存在**

```bash
ls -la scripts/reporter/fonts/
```

Expected: 3 个 .woff2 文件存在，每个 > 2MB

- [ ] **Step 4: Commit**

```bash
git add scripts/reporter/fonts/
git commit -m "chore: add local woff2 font files for Puppeteer rendering"
```

---

### Task 16: 全量测试 + CI 就绪

- [ ] **Step 1: 运行全部单元测试**

```bash
npx vitest run
```

Expected: All tests PASS (types: >= 20 tests across config, data, templates, screenshot, report)

- [ ] **Step 2: 运行 TypeScript 类型检查**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: 添加 package.json scripts**

确保 `scripts/reporter/package.json` 包含以下 scripts：

```json
{
  "scripts": {
    "start": "npx tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts/reporter/
git commit -m "chore: finalize reporter project with all tests passing"
```

---

## 总结

| 指标 | 值 |
|------|-----|
| 总任务数 | 16 |
| 预计总时间 | 2-3 小时 |
| 测试覆盖 | unit (config, data, templates, screenshot, report) + typecheck |
| 字体策略 | 本地 woff2，@font-face + file:// 绝对路径 |
| Browser 管理 | BrowserPool 单例，launchPromise 去重，三重 exit 清理 |
| 截图输出 | PNG → sharp JPEG 85% → output/*.jpg |
| 设计系统 | [评审终稿 v5] 纯白底 + 深墨蓝 + 玫红品牌 + 收入分级编码 |
