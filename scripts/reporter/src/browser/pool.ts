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
