import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { Top3Context, Top3Case } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "top3.html")

function parseIncomeAmount(rev: string): number {
  const match = rev.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function getIncomeTier(rev: string): string {
  const amount = parseIncomeAmount(rev)
  if (amount >= 3000) return "high"
  if (amount >= 1000) return "mid"
  return "low"
}

function getCostClass(cost: string): string {
  if (cost.includes("零成本") || cost.includes("0")) return "tag-cost-zero"
  return "tag-cost"
}

function getIncomeClass(rev: string): string {
  const tier = getIncomeTier(rev)
  if (tier === "high") return "tag-income-high"
  if (tier === "mid") return "tag-income-mid"
  return "tag-income-low"
}

export function renderTop3(ctx: Top3Context): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const fontBase = (name: string) =>
    `file:///${resolve(config.FONTS_DIR, name).replace(/\\/g, "/")}`

  const cases = ctx.cases.map((c) => ({
    ...c,
    costClass: getCostClass(c.cost),
    incomeClass: getIncomeClass(c.expected_revenue),
    tags: c.tags.map((t, i) => ({ text: t, tagIndex: i % 5 })),
  }))

  return renderTemplate(template, {
    fontSerif: fontBase("NotoSerifSC-Bold.woff2"),
    fontSans: fontBase("NotoSansSC-Regular.woff2"),
    fontMono: fontBase("RobotoMono-Bold.woff2"),
    date: ctx.date,
    cases,
  })
}
