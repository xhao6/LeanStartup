import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { Last3DaysContext } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "last3days.html")

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

function formatDayLabel(dateStr: string, dayNum: number): string {
  const d = new Date(dateStr + "T00:00:00+08:00")
  const weekDay = WEEKDAYS[d.getDay()] ?? ""
  return `DAY ${dayNum} · ${dateStr} ${weekDay}`
}

function getRankClass(rank: number): string {
  if (rank === 1) return "rank-gold"
  if (rank === 2) return "rank-silver"
  if (rank === 3) return "rank-bronze"
  return ""
}

function parseIncomeAmount(rev: string): number {
  const match = rev.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function getIncomeClass(rev: string): string {
  const amount = parseIncomeAmount(rev)
  if (amount >= 3000) return "mini-income-high"
  if (amount >= 1000) return "mini-income-mid"
  return "mini-income-low"
}

function getCostClass(cost: string): string {
  return (cost.includes("零成本") || cost.includes("0")) ? "mini-cost-zero" : "mini-cost-other"
}

export function renderLast3Days(ctx: Last3DaysContext): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const fontBase = (name: string) =>
    `file:///${resolve(config.FONTS_DIR, name).replace(/\\/g, "/")}`

  const days = ctx.days.map((g, di) => ({
    dayLabel: formatDayLabel(g.date, di + 1),
    cases: g.cases.map((c, ci) => ({
      ...c,
      rank: ci + 1,
      rankClass: getRankClass(ci + 1),
      incomeClass: getIncomeClass(c.expected_revenue),
      costClass: getCostClass(c.cost),
      rowClass: ci % 2 === 0 ? "even" : "odd",
    })),
  }))

  return renderTemplate(template, {
    fontSerif: fontBase("NotoSerifSC-Bold.woff2"),
    fontSans: fontBase("NotoSansSC-Regular.woff2"),
    fontMono: fontBase("RobotoMono-Bold.woff2"),
    hasDays: ctx.days.length > 0,
    days,
  })
}
