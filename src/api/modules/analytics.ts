// 埋点 API
import { callFunction } from '../core/cloud'

export const trackEvent = async (event: string, caseId?: string, extra?: Record<string, any>): Promise<void> => {
  try {
    await callFunction('trackEvent', { event, case_id: caseId, extra })
  } catch (e) {
    // 埋点失败不阻塞主流程
    console.warn('[Analytics] trackEvent failed:', e)
  }
}
