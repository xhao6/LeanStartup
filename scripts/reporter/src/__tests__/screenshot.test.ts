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
    const disconnectHandler = mockBrowser1.on.mock.calls.find(
      (call: any[]) => call[0] === "disconnected"
    )?.[1] as Function | undefined
    expect(disconnectHandler).toBeDefined()
    disconnectHandler!()

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

vi.mock("../config.js", () => ({
  config: {
    OUTPUT_DIR: "/fake/output",
  },
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvaluate.mockResolvedValue(1440)
  })

  it("renders HTML and returns ScreenshotResult", async () => {
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
    expect(result.sizeBytes).toBeGreaterThan(0)
  })

  it("uses dynamic height when body exceeds default", async () => {
    mockEvaluate
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(2000)
    const { screenshotToFile } = await import("../browser/screenshot.js")
    const result = await screenshotToFile(
      mockPage as any,
      "<h1>Long</h1>",
      "test-dynamic",
    )
    expect(result.height).toBe(2000)
  })
})
