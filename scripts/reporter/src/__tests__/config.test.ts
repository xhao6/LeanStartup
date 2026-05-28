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
    await expect(import("../config.js")).rejects.toThrow("CLOUDBASE_ENV_ID")
  })

  it("throws when CLOUDBASE_SECRET_ID is missing", async () => {
    process.env.CLOUDBASE_ENV_ID = "test-env"
    delete process.env.CLOUDBASE_SECRET_ID
    await expect(import("../config.js")).rejects.toThrow("CLOUDBASE_SECRET_ID")
  })

  it("throws when CLOUDBASE_SECRET_KEY is missing", async () => {
    process.env.CLOUDBASE_ENV_ID = "test-env"
    process.env.CLOUDBASE_SECRET_ID = "test-id"
    delete process.env.CLOUDBASE_SECRET_KEY
    await expect(import("../config.js")).rejects.toThrow("CLOUDBASE_SECRET_KEY")
  })

  it("resolves config with all env vars present", async () => {
    process.env.CLOUDBASE_ENV_ID = "test-env"
    process.env.CLOUDBASE_SECRET_ID = "test-id"
    process.env.CLOUDBASE_SECRET_KEY = "test-key"
    const { config } = await import("../config.js")
    expect(config.ENV_ID).toBe("test-env")
    expect(config.OUTPUT_DIR).toContain("output")
  })
})
