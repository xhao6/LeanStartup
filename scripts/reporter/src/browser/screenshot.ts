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
  await page.setDefaultNavigationTimeout(120_000)
  await page.setContent(html, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  // Wait for fonts and layout stabilization (14MB CJK fonts take time)
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 2000))
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
    jpegBuffer = Buffer.from(await sharp(pngBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer())
  } catch {
    console.warn("sharp compression failed, using PNG format")
    jpegBuffer = Buffer.from(pngBuffer)
  }

  await writeFile(outPath, jpegBuffer)

  return {
    path: outPath,
    width: VIEWPORT_WIDTH,
    height: captureHeight,
    sizeBytes: jpegBuffer.length,
  }
}
