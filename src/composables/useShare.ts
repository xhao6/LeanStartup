// 分享配置
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

const defaultConfig = { title: '精益副业案例库', path: '/pages/index/index', imageUrl: '' }

export const useShare = (custom?: { title?: string; path?: string; imageUrl?: string }) => {
  const cfg = { ...defaultConfig, ...custom }

  onShareAppMessage(() => ({ title: cfg.title, path: cfg.path, imageUrl: cfg.imageUrl }))
  onShareTimeline(() => ({ title: cfg.title, path: cfg.path, imageUrl: cfg.imageUrl }))

  const triggerShare = () => { /* UniApp 自动处理 */ }

  return { triggerShare }
}
