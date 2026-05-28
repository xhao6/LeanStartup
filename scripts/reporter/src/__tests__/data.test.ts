import { describe, it, expect, vi } from "vitest"

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

  it("returns last 3 records ordered by date desc", async () => {
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
    const db = { collection: vi.fn(() => chain), command: { in: vi.fn((arr: string[]) => arr) } } as any
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
