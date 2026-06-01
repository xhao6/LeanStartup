import { readFileSync } from "node:fs"
import { resolve, dirname, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { Top3Context, Top3Case } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "top3.html")

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

function imageToDataUri(filePath: string): string {
  const data = readFileSync(filePath)
  const ext = extname(filePath).toLowerCase()
  const mime = MIME_TYPES[ext] ?? "image/png"
  return `data:${mime};base64,${data.toString("base64")}`
}

export function renderTop3(ctx: Top3Context, coverPath?: string): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const fontBase = (name: string) =>
    `file:///${resolve(config.FONTS_DIR, name).replace(/\\/g, "/")}`

  const cases = ctx.cases.map((c) => ({
    ...c,
    rankPad: String(c.rank).padStart(2, "0"),
    tags: c.tags.map((t, i) => ({ text: t, tagIndex: i % 5 })),
  }))

  let coverDataUri = ""
  if (coverPath) {
    try {
      coverDataUri = imageToDataUri(coverPath)
    } catch {
      console.warn(`Warning: could not load cover image at ${coverPath}`)
    }
  }

  return renderTemplate(template, {
    fontSerif: fontBase("NotoSerifSC-Bold.woff2"),
    fontSans: fontBase("NotoSansSC-Regular.woff2"),
    fontMono: fontBase("RobotoMono-Bold.woff2"),
    date: ctx.date,
    cases,
    coverPath: coverDataUri,
  })
}
