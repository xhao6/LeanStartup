// wx.cloud.callFunction 封装

export interface CloudResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

const isWxCloud = () => typeof wx !== 'undefined' && wx.cloud != null
const isUniCloud = () => typeof uni !== 'undefined' && uni.cloud != null

export const callFunction = async <T = any>(
  name: string,
  data: Record<string, any> = {}
): Promise<CloudResult<T>> => {
  if (!isWxCloud() && !isUniCloud()) {
    return { success: false, error: 'Cloud environment not available' }
  }
  try {
    let res: any
    if (isWxCloud()) {
      res = await wx.cloud.callFunction({ name, data })
    } else {
      res = await uni.cloud.callFunction({ name, data })
    }
    const result = res.result
    // 如果 result 已经有 success 字段（云函数自己包装过），直接返回
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        return { success: false, error: (result as any).error || (result as any).message || 'Cloud function failed' }
      }
      return { success: true, data: (result as any).data as T }
    }
    // 否则直接返回 result
    return { success: true, data: result as T }
  } catch (err: any) {
    console.error(`[Cloud] ${name} failed:`, err)
    return { success: false, error: err.message || 'Cloud function error' }
  }
}
