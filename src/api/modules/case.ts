// 案例详情 API
import { callFunction, type CloudResult } from '../core/cloud'

export interface CaseDetail {
  id: string
  title: string
  summary: string
  story?: string
  source_account: string
  source_url: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  cost: string
  expected_revenue: string
  cycle: string
  suitable_for: string
  tags?: string[]
  steps?: { step: string; order: number }[]
  tools?: { name: string; desc: string }[]
  pitfalls?: string
  risk_tags?: string[]
}

export const getCaseDetail = async (caseId: string): Promise<CloudResult<CaseDetail>> => {
  return callFunction<CaseDetail>('getCaseDetail', { case_id: caseId })
}
