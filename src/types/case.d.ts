export interface CaseDetail {
  id: string
  title: string
  source_account?: string
  source_url?: string
  tags?: string[]
  summary?: string
  story?: string
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
  image?: string
  progress?: Record<string, boolean>
}
