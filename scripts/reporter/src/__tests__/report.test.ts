import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../cloudbase.js", () => ({
  getDatabase: vi.fn(),
}))

vi.mock("../browser/pool.js", () => ({
  BrowserPool: vi.fn(function () {
    return {
      get: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          setContent: vi.fn().mockResolvedValue(undefined),
          setViewport: vi.fn().mockResolvedValue(undefined),
          evaluate: vi.fn().mockResolvedValue(1440),
          screenshot: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
  }),
}))

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-jpg")),
  })),
}))

vi.mock("../config.js", () => ({
  config: {
    ENV_ID: "test",
    SECRET_ID: "test",
    SECRET_KEY: "test",
    OUTPUT_DIR: "/tmp/reporter-output",
    FONTS_DIR: "/tmp/reporter-fonts",
  },
  ensureOutputDir: vi.fn(),
}))

describe("generateDailyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws when DailyPick has no data for date", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ data: [] }),
      }),
      command: {},
    }
    ;(getDatabase as any).mockReturnValue(mockDb)

    const { generateDailyReport } = await import("../lib/report.js")
    await expect(generateDailyReport("2026-01-01")).rejects.toThrow("No daily pick")
  })

  it("generates top3 screenshot when pick exists", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    const dailyPickData = { date: "2026-01-01", case_ids: ["100001"] }
    const caseData = {
      _id: "1",
      id: "100001",
      title: "案例1",
      score_total: 9,
      cost: "零成本",
      expected_revenue: "月入5000+",
      cycle: "1周",
      suitable_for: "上班族",
      source_account: "x",
      tags: ["a", "b", "c", "d", "e"],
      summary: "sum",
      status: "published",
      score_feasibility: 2,
      score_profit: 2,
      score_timeliness: 2,
      score_detail: 1,
      score_fitness: 1,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    }

    const mockDb = {
      collection: vi.fn((name: string) => {
        if (name === "DailyPick") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ data: [dailyPickData] }),
          }
        }
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ data: [caseData] }),
        }
      }),
      command: { in: vi.fn((arr: string[]) => arr) },
    }
    ;(getDatabase as any).mockReturnValue(mockDb)

    const { generateDailyReport } = await import("../lib/report.js")
    const results = await generateDailyReport("2026-01-01")
    expect(results.top3).toBeDefined()
    expect(results.top3!.path).toContain("top3")
  })
})
