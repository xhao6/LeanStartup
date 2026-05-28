export interface CaseRecord {
  _id: string
  id: string
  title: string
  source_account?: string
  source_url?: string
  summary?: string
  case_story?: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  cost?: string
  expected_revenue?: string
  cycle?: string
  suitable_for?: string
  steps?: Array<{ step: string } | string>
  tools?: Array<{ name: string; desc: string }>
  pitfalls?: string
  risk_tags?: string[]
  tags?: string[]
  status: string
  created_at: string
  updated_at: string
  published_at?: string
}

export interface DailyPickRecord {
  _id: string
  date: string
  case_ids: string[]
  created_at: string
}

export interface Top3Context {
  date: string
  cases: Top3Case[]
}

export interface Top3Case {
  id: string
  rank: number
  title: string
  summary: string
  score_total: number
  cost: string
  expected_revenue: string
  cycle: string
  suitable_for: string
  source_account: string
  tags: string[]
}

export interface CaseDetailContext {
  title: string
  source_account: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  summary: string
  case_story: string
  steps: string[]
  tools: Array<{ name: string; desc: string }>
  pitfalls: string
  risk_tags: string[]
  cost: string
  expected_revenue: string
  cycle: string
  suitable_for: string
}

export interface Last3DaysContext {
  days: DayGroup[]
}

export interface DayGroup {
  date: string
  dayLabel: string
  cases: Top3Case[]
}

export interface QueryResult<T> {
  data: T | null
  error?: string
}

export interface ScreenshotResult {
  path: string
  width: number
  height: number
  sizeBytes: number
}
