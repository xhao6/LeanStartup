import { getDatabase } from "../cloudbase.js"
import { fetchDailyPick, fetchRecentPicks } from "../data/daily-pick.js"
import { fetchCasesByIds, fetchCaseById } from "../data/case.js"
import { renderTop3 } from "../templates/top3.js"
import { renderCaseDetail, caseRecordToContext } from "../templates/case-detail.js"
import { renderLast3Days } from "../templates/last3days.js"
import { BrowserPool } from "../browser/pool.js"
import { screenshotToFile } from "../browser/screenshot.js"
import { ensureOutputDir } from "../config.js"
import type { Top3Context, Last3DaysContext, Top3Case, DayGroup, ScreenshotResult, CaseRecord } from "../types.js"

export interface ReportResults {
  top3?: ScreenshotResult
  caseDetail?: ScreenshotResult
  last3Days?: ScreenshotResult
}

function buildTop3Case(record: CaseRecord, rank: number): Top3Case {
  return {
    id: record.id,
    rank,
    title: record.title,
    summary: record.summary ?? "",
    score_total: record.score_total,
    cost: record.cost ?? "未标注",
    expected_revenue: record.expected_revenue ?? "未标注",
    cycle: record.cycle ?? "未标注",
    suitable_for: record.suitable_for ?? "通用",
    source_account: record.source_account ?? "",
    tags: record.tags ?? [],
  }
}

export async function generateDailyReport(date: string): Promise<ReportResults> {
  ensureOutputDir()
  const db = getDatabase()

  const pick = await fetchDailyPick(db, date)
  if (!pick) throw new Error(`No daily pick found for ${date}`)

  const allCases = await fetchCasesByIds(db, pick.case_ids)
  const caseMap = new Map(allCases.map((c) => [c.id, c]))
  const orderedCases = pick.case_ids
    .map((id) => caseMap.get(id))
    .filter((c): c is CaseRecord => !!c)

  const pool = new BrowserPool()
  const browser = await pool.get()
  const page = await browser.newPage()

  const results: ReportResults = {}

  try {
    // HTML-1: Today's Top 3
    const top3Ctx: Top3Context = {
      date: pick.date,
      cases: orderedCases.map((c, i) => buildTop3Case(c, i + 1)),
    }
    const top3Html = renderTop3(top3Ctx)
    results.top3 = await screenshotToFile(page, top3Html, "top3")

    // HTML-2: Case detail (first case)
    if (orderedCases.length > 0) {
      const detailCtx = caseRecordToContext(orderedCases[0])
      const detailHtml = renderCaseDetail(detailCtx)
      results.caseDetail = await screenshotToFile(page, detailHtml, "case-detail")
    }

    // HTML-3: Last 3 days
    const recentPicks = await fetchRecentPicks(db, 3)
    if (recentPicks.length > 0) {
      const dayGroups: DayGroup[] = []
      for (const rp of recentPicks) {
        const dayCases = await fetchCasesByIds(db, rp.case_ids)
        const dayCaseMap = new Map(dayCases.map((c) => [c.id, c]))
        const orderedDayCases = rp.case_ids
          .map((id) => dayCaseMap.get(id))
          .filter((c): c is CaseRecord => !!c)

        dayGroups.push({
          date: rp.date,
          dayLabel: "",
          cases: orderedDayCases.map((c, i) => buildTop3Case(c, i + 1)),
        })
      }
      const last3Ctx: Last3DaysContext = { days: dayGroups }
      const last3Html = renderLast3Days(last3Ctx)
      results.last3Days = await screenshotToFile(page, last3Html, "last3days")
    }
  } finally {
    await page.close()
  }

  return results
}

export async function generateCaseDetailReport(caseId: string): Promise<ScreenshotResult> {
  ensureOutputDir()
  const db = getDatabase()

  const record = await fetchCaseById(db, caseId)
  if (!record) throw new Error(`Case not found: ${caseId}`)

  const pool = new BrowserPool()
  const browser = await pool.get()
  const page = await browser.newPage()

  try {
    const ctx = caseRecordToContext(record)
    const html = renderCaseDetail(ctx)
    return await screenshotToFile(page, html, `case-detail-${caseId}`)
  } finally {
    await page.close()
  }
}
