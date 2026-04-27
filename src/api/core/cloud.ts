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
  console.log(`[Cloud] 调用云函数 ${name}`, { data })

  const isWxCloud = () => typeof wx !== 'undefined' && wx.cloud != null
  const isUniCloud = () => typeof uni !== 'undefined' && uni.cloud != null

  console.log(`[Cloud] 环境检测`, {
    hasWx: typeof wx !== 'undefined',
    hasWxCloud: isWxCloud(),
    hasUni: typeof uni !== 'undefined',
    hasUniCloud: isUniCloud()
  })

  if (!isWxCloud() && !isUniCloud()) {
    console.error('[Cloud] Cloud environment not available')
    return { success: false, error: 'Cloud environment not available' }
  }
  try {
    let res: any
    if (isUniCloud()) {
      console.log('[Cloud] 使用 uni.cloud.callFunction')
      res = await uni.cloud.callFunction({ name, data })
    } else {
      console.log('[Cloud] 使用 wx.cloud.callFunction')
      res = await wx.cloud.callFunction({ name, data })
    }

    console.log(`[Cloud] ${name} 原始响应`, res)

    const result = res.result
    // 如果 result 已经有 success 字段（云函数自己包装过），直接返回
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        console.error(`[Cloud] ${name} 业务失败`, result)
        return { success: false, error: (result as any).error || (result as any).message || 'Cloud function failed' }
      }
      console.log(`[Cloud] ${name} 业务成功`, result.data)
      return { success: true, data: (result as any).data as T }
    }
    // 否则直接返回 result
    console.log(`[Cloud] ${name} 直接返回 result`, result)
    return { success: true, data: result as T }
  } catch (err: any) {
    console.error(`[Cloud] ${name} 调用异常`, err)
    return { success: false, error: err.message || err.errMsg || 'Cloud function error' }
  }
}
