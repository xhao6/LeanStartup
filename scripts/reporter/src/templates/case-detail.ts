import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { renderTemplate } from "./engine.js"
import { config } from "../config.js"
import type { CaseDetailContext, CaseRecord } from "../types.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = resolve(__dirname, "html", "case-detail.html")

const DIM_META = [
  { key: "fea", label: "可行性", max: 3 },
  { key: "pro", label: "盈利能力", max: 2 },
  { key: "tim", label: "时效性", max: 2 },
  { key: "det", label: "详实度", max: 2 },
  { key: "fit", label: "适合度", max: 1 },
]

export function caseRecordToContext(record: CaseRecord): CaseDetailContext {
  return {
    title: record.title,
    score_total: record.score_total,
    score_feasibility: record.score_feasibility,
    score_profit: record.score_profit,
    score_timeliness: record.score_timeliness,
    score_detail: record.score_detail,
    score_fitness: record.score_fitness,
    summary: record.summary ?? "",
    case_story: record.case_story ?? "",
    steps: (record.steps ?? []).map((s) => (typeof s === "string" ? s : s.step)),
    tools: (record.tools ?? []).map((t) =>
      typeof t === "string" ? { name: t, desc: "" } : t
    ),
    pitfalls: record.pitfalls ?? "",
    risk_tags: record.risk_tags ?? [],
    tags: record.tags ?? [],
    cost: record.cost ?? "未标注",
    expected_revenue: record.expected_revenue ?? "未标注",
    cycle: record.cycle ?? "未标注",
    suitable_for: record.suitable_for ?? "通用",
  }
}

export function renderCaseDetail(ctx: CaseDetailContext): string {
  const template = readFileSync(TEMPLATE_PATH, "utf-8")

  const fontBase = (name: string) =>
    `file:///${resolve(config.FONTS_DIR, name).replace(/\\/g, "/")}`

  const scores = [ctx.score_feasibility, ctx.score_profit, ctx.score_timeliness, ctx.score_detail, ctx.score_fitness]
  const maxes = [3, 2, 2, 2, 1]

  const dimensions = DIM_META.map((m, i) => ({
    key: m.key,
    label: m.label,
    score: scores[i],
    max: maxes[i],
    pct: Math.round((scores[i] / maxes[i]) * 100),
  }))

  const allSteps = ctx.steps.map((text: string, i: number) => ({ num: i + 1, text }))

  const toolLimit = 6
  const displayTools = ctx.tools.slice(0, toolLimit)
  const hasMoreTools = ctx.tools.length > toolLimit

  const positioning = ctx.summary || `利用信息差，${ctx.cost}启动的副业实操`

  return renderTemplate(template, {
    fontSerif: fontBase("NotoSerifSC-Bold.woff2"),
    fontSans: fontBase("NotoSansSC-Regular.woff2"),
    fontMono: fontBase("RobotoMono-Bold.woff2"),
    title: ctx.title,
    score_total: ctx.score_total,
    tags: ctx.tags.map((t, i) => ({ text: t, tagIndex: i % 5 })),
    positioning,
    dimensions,
    case_story: ctx.case_story,
    steps: allSteps,
    hasTools: ctx.tools.length > 0,
    tools: displayTools,
    hasMoreTools,
    hasPitfalls: !!(ctx.pitfalls || ctx.risk_tags.length > 0),
    pitfalls: ctx.pitfalls,
    hasRiskTags: ctx.risk_tags.length > 0,
    risk_tags: ctx.risk_tags,
  })
}
