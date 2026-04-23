import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

interface ShareConfig {
  title?: string
  path?: string
  imageUrl?: string
}

export function useShare(customShare?: ShareConfig) {
  const defaults = {
    title: '精益副业案例库 - 每日精选副业案例',
    path: '/pages/index/index',
    imageUrl: ''
  }

  onShareAppMessage(() => ({
    title: customShare?.title || defaults.title,
    path: customShare?.path || defaults.path,
    imageUrl: customShare?.imageUrl || defaults.imageUrl
  }))

  onShareTimeline(() => ({
    title: customShare?.title || defaults.title,
    query: '',
    imageUrl: customShare?.imageUrl || defaults.imageUrl
  }))

  return { triggerShare: () => { console.log('[Share] triggered') } }
}
