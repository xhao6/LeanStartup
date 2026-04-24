// 今日精选 + 历史榜单 API
import { callFunction } from '../core/cloud'

export interface DailyCase {
  id: string
  title: string
  summary: string
  score_total: number
  cost: string
  source_account: string
  suitable_for: string
  tags?: string[]
  cycle?: string
}

export interface DailyPickResponse {
  date: string
  cases: DailyCase[]
}

export interface HistoryItem {
  date: string
  case_ids: string[]
}

export const getDailyPick = async (date?: string): Promise<{ success: boolean; data?: DailyPickResponse }> => {
  return callFunction('getDailyPick', date ? { date } : {})
}

export const getHistoryPicks = async (params: { page?: number; pageSize?: number } = {}): Promise<{ success: boolean; data?: { total: number; list: { date: string; case_ids: string[] }[]; page: number; pageSize: number } }> => {
  // 注意：云函数 getDailyPick 有 page 参数时走分页模式，返回 { total, list, page, pageSize }
  // list 中每项只有 { date, case_ids }，需要额外查 Case 才能拿到 top3Titles（见 Plan 3 Task 3.1 注意）
  return callFunction('getDailyPick', params)
}
