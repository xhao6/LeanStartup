import { describe, it, expect, vi } from "vitest"
import { renderLast3Days } from "../templates/last3days.js"
import type { Last3DaysContext, Top3Case } from "../types.js"

vi.mock("../config.js", () => ({
  config: { FONTS_DIR: "/mock/fonts" },
}))

const caseStub = (overrides: Partial<Top3Case> = {}): Top3Case => ({
  id: "1", rank: 1, title: "案例", summary: "", score_total: 8,
  cost: "零成本", expected_revenue: "月入3000", cycle: "1周",
  suitable_for: "通用", source_account: "x", tags: ["t1"],
  ...overrides,
})

describe("renderLast3Days", () => {
  it("renders 3 day groups with cases", () => {
    const ctx: Last3DaysContext = {
      days: [
        { date: "2026-05-26", dayLabel: "", cases: [caseStub({ title: "A", score_total: 9 })] },
        { date: "2026-05-25", dayLabel: "", cases: [caseStub({ title: "B", score_total: 8 })] },
        { date: "2026-05-24", dayLabel: "", cases: [caseStub({ title: "C", score_total: 7 })] },
      ],
    }
    const html = renderLast3Days(ctx)
    expect(html).toContain("DAY 1")
    expect(html).toContain("DAY 2")
    expect(html).toContain("DAY 3")
    expect(html).toContain("A")
    expect(html).toContain("B")
    expect(html).toContain("C")
  })

  it("shows empty state when no days", () => {
    const ctx: Last3DaysContext = { days: [] }
    const html = renderLast3Days(ctx)
    expect(html).toContain("每日更新精选案例")
  })

  it("uses zebra striping row classes", () => {
    const ctx: Last3DaysContext = {
      days: [{
        date: "2026-05-26", dayLabel: "",
        cases: [caseStub(), caseStub({ id: "2" }), caseStub({ id: "3" })],
      }],
    }
    const html = renderLast3Days(ctx)
    expect(html).toContain("row-even")
    expect(html).toContain("row-odd")
  })

  it("assigns rank gold/silver/bronze classes", () => {
    const ctx: Last3DaysContext = {
      days: [{
        date: "2026-05-26", dayLabel: "",
        cases: [caseStub(), caseStub({ id: "2" }), caseStub({ id: "3" })],
      }],
    }
    const html = renderLast3Days(ctx)
    expect(html).toContain("rank-gold")
    expect(html).toContain("rank-silver")
    expect(html).toContain("rank-bronze")
  })
})
