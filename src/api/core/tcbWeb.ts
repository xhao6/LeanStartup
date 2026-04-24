// CloudBase HTTP trigger 调用（Web SDK 初始化）
// H5/Web 环境使用，微信小程序使用 wx.cloud.init
import { config } from '@/config'

// Web SDK 实例（延迟初始化）
let webSdkInstance: any = null

export const initTcbWeb = () => {
  // Web SDK 在 H5 环境下使用，微信小程序不需要
  // 暂时留空，后续按需实现
}

export const getTcbWeb = () => {
  return webSdkInstance
}
