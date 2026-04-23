import { ref } from 'vue'
import { CF } from '@/utils/constants'

export type ScoreField = 'score_feasibility' | 'score_profit' | 'score_timeliness' | 'score_detail' | 'score_fitness'

export interface CaseDetail {
  id: string
  title: string
  summary: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  cost: string
  source_account: string
  source_url?: string
  suitable_for: string | string[]
  steps?: Array<{ title: string; description?: string }>
  tools?: Array<{ name: string; description?: string }>
  resources?: Array<{ name: string; url?: string }>
  // 内容扩展字段（数据库已存在）
  expected_revenue?: string     // 预期收益，如 "5000+/月"
  cycle?: string                // 变现周期，如 "1-2周"
  case_story?: string           // 案例故事（300-800字）
  pitfalls?: string             // 避坑指南
  risk_tags?: string[]          // 风险标签
  tags?: string[]               // 眼睛标签（5个，2-6字）
}

/** Safely read a score dimension value from a CaseDetail object */
export function getScoreValue(data: Partial<CaseDetail>, key: string): number {
  return Number((data as Record<string, unknown>)[key]) || 0
}

export function useCaseDetail() {
  const caseData = ref<CaseDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchDetail = async (caseId: string) => {
    isLoading.value = true
    error.value = null
    try {
      const res = await wx.cloud.callFunction({
        name: CF.GET_CASE_DETAIL,
        data: { case_id: caseId }
      }) as any
      if (res.result?.errCode === 0 && res.result?.data?.case) {
        caseData.value = res.result.data.case
      } else {
        error.value = '获取案例详情失败'
      }
    } catch (e) {
      error.value = '网络错误，请稍后重试'
    } finally {
      isLoading.value = false
    }
  }

  return { caseData, isLoading, error, fetchDetail }
}
