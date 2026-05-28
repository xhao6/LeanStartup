import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderTemplate } from "../templates/engine.js"

vi.mock("../config.js", () => ({
  config: {
    ENV_ID: "test-env",
    SECRET_ID: "test-secret-id",
    SECRET_KEY: "test-secret-key",
    FONTS_DIR: "/mock/fonts",
    OUTPUT_DIR: "/tmp/reporter-output",
  },
  ensureOutputDir: () => {},
}))

import { renderCaseDetail } from "../templates/case-detail.js"
import type { Top3Case, Top3Context, CaseDetailContext } from "../types.js"

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
    expect(html).toContain("步骤一")
    expect(html).toContain("工具A")
    expect(html).toContain("注意风险")
    expect(html).toContain("时间成本")
  })

  it("shows decision summary strip", () => {
    const html = renderCaseDetail(baseCtx)
    expect(html).toContain("零成本")
    expect(html).toContain("月入5000+")
    expect(html).toContain("2周")
    expect(html).toContain("上班族")
  })

  it("hides pitfalls section when empty", () => {
    const ctx = { ...baseCtx, pitfalls: "", risk_tags: [] }
    const html = renderCaseDetail(ctx)
    expect(html).not.toContain("避坑指南")
  })

  it("shows view more when steps exceed 5", () => {
    const ctx = { ...baseCtx, steps: Array.from({ length: 8 }, (_, i) => `步骤${i + 1}`) }
    const html = renderCaseDetail(ctx)
    expect(html).toContain("查看全部")
  })

  it("income high gets revenue-high class", () => {
    const html = renderCaseDetail(baseCtx)
    expect(html).toContain("dc-revenue-high")
  })
})

const createTop3Case = (overrides: Partial<Top3Case> = {}): Top3Case => ({
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

const top3Html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"></head><body>
{{#each cases}}
<div class="card">
  <div class="rank-badge rank-{{rank}}"><span class="rank-num">{{rank}}</span></div>
  <div class="card-title">{{title}}</div>
  <div class="card-summary">{{summary}}</div>
  <span class="decision-tag {{costClass}}">{{cost}}</span>
  <span class="decision-tag {{incomeClass}}">{{expected_revenue}}</span>
  {{#each tags}}<span class="tag tag-{{tagIndex}}">{{text}}</span>{{/each}}
</div>
{{/each}}
</body></html>`

describe("renderTop3", () => {
  vi.doMock("node:fs", () => ({
    readFileSync: () => top3Html,
  }))

  beforeEach(() => {
    vi.resetModules()
  })

  it("renders top3 HTML with 3 cases", async () => {
    const { renderTop3 } = await import("../templates/top3.js")
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [
        createTop3Case({ rank: 1, title: "案例一", score_total: 9 }),
        createTop3Case({ rank: 2, title: "案例二", score_total: 7 }),
        createTop3Case({ rank: 3, title: "案例三", score_total: 6 }),
      ],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("案例一")
    expect(html).toContain("案例二")
    expect(html).toContain("案例三")
    expect(html).toContain("rank-1")
    expect(html).toContain("rank-3")
  })

  it("marks high income with income-high class", async () => {
    const { renderTop3 } = await import("../templates/top3.js")
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createTop3Case({ rank: 1, expected_revenue: "月入5000+" })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("tag-income-high")
  })

  it("marks zero cost with cost-zero class", async () => {
    const { renderTop3 } = await import("../templates/top3.js")
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createTop3Case({ rank: 1, cost: "零成本" })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("tag-cost-zero")
  })

  it("marks mid income with income-mid class", async () => {
    const { renderTop3 } = await import("../templates/top3.js")
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createTop3Case({ rank: 1, expected_revenue: "月入2000+" })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("tag-income-mid")
  })

  it("renders all 5 tags with morandi color classes", async () => {
    const { renderTop3 } = await import("../templates/top3.js")
    const ctx: Top3Context = {
      date: "2026-05-26",
      cases: [createTop3Case({ rank: 1, tags: ["A", "B", "C", "D", "E"] })],
    }
    const html = renderTop3(ctx)
    expect(html).toContain("tag-0")
    expect(html).toContain("tag-4")
  })
})
