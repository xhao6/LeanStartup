import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../cloudbase.js", () => ({
  getDatabase: vi.fn(),
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

class MockAnthropic {
  messages = {
    create: vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "推荐标题\n\n1. 测试标题" }],
    }),
  }
}

vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropic,
}))

vi.mock("node:child_process", () => ({
  execFile: vi.fn((_file, _args, _opts, cb: any) => {
    if (cb) cb(null, { stdout: "", stderr: "" })
    return { stdout: "" }
  }),
}))

describe("generateXhsCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw when no daily pick found", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    ;(getDatabase as any).mockReturnValue({
      collection: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ data: [] }),
      }),
      command: {},
    })

    const { generateXhsCopy } = await import("../lib/copywriter.js")
    await expect(generateXhsCopy("2026-06-01")).rejects.toThrow("No daily pick found")
  })

  it("should throw when MINIMAX_API_KEY is not set", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    ;(getDatabase as any).mockReturnValue({
      collection: vi.fn((name: string) => {
        if (name === "DailyPick") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              data: [{ date: "2026-06-01", case_ids: ["100011"] }],
            }),
          }
        }
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            data: [{
              id: "100011", title: "测试案例", summary: "摘要",
              tags: ["AI"], source_account: "test", status: "published",
              score_total: 10, score_feasibility: 3, score_profit: 2,
              score_timeliness: 2, score_detail: 2, score_fitness: 1,
              created_at: "", updated_at: "",
            }],
          }),
        }
      }),
      command: { in: vi.fn((arr: string[]) => arr) },
    })

    const { generateXhsCopy } = await import("../lib/copywriter.js")
    const origKey = process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_API_KEY
    await expect(generateXhsCopy("2026-06-01")).rejects.toThrow("MINIMAX_API_KEY")
    if (origKey) process.env.MINIMAX_API_KEY = origKey
  })

  it("should generate copy and write to file successfully", async () => {
    const { getDatabase } = await import("../cloudbase.js")
    ;(getDatabase as any).mockReturnValue({
      collection: vi.fn((name: string) => {
        if (name === "DailyPick") {
          return {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              data: [{ date: "2026-06-01", case_ids: ["100011"] }],
            }),
          }
        }
        return {
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            data: [{
              id: "100011", title: "测试案例", summary: "摘要",
              tags: ["AI", "独立开发"], source_account: "test",
              status: "published",
              score_total: 10, score_feasibility: 3, score_profit: 2,
              score_timeliness: 2, score_detail: 2, score_fitness: 1,
              created_at: "", updated_at: "",
            }],
          }),
        }
      }),
      command: { in: vi.fn((arr: string[]) => arr) },
    })

    process.env.MINIMAX_API_KEY = "test-key"
    const { generateXhsCopy } = await import("../lib/copywriter.js")
    const result = await generateXhsCopy("2026-06-01")
    expect(result).toContain("xhs-copy.txt")
  })
})
