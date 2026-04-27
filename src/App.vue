<script setup lang="ts">
	import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
	import { config } from '@/config'
	import { initTcbWeb } from '@/api/core/tcbWeb'

	onLaunch(() => {
	  console.log('App Launch')

	  // 环境检测优先级：uni-app > 微信原生 > Web SDK
	  if (typeof uni !== 'undefined' && uni.cloud) {
	    // uni-app 环境（包括微信小程序）
	    uni.cloud.init({
	      env: config.cloud.envId,
	      traceUser: true
	    })
	    console.log('[CloudBase] initialized via uni.cloud:', config.cloud.envId)

	    // 启用分享菜单（分享给朋友和分享到朋友圈）
	    uni.showShareMenu({
	      withShareTicket: true,
	      menus: ['shareAppMessage', 'shareTimeline']
	    })
	    console.log('[CloudBase] 分享菜单已启用')
	  } else if (typeof wx !== 'undefined' && wx.cloud) {
	    // 原生微信小程序环境（备用）
	    wx.cloud.init({
	      env: config.cloud.envId,
	      traceUser: true
	    })
	    console.log('[CloudBase] initialized via wx.cloud:', config.cloud.envId)

	    wx.showShareMenu({
	      withShareTicket: true,
	      menus: ['shareAppMessage', 'shareTimeline']
	    })
	  } else {
	    // H5/Web 环境：使用 Web SDK 或 HTTP 触发器
	    try {
	      initTcbWeb()
	      console.log('CloudBase Web SDK initialized')
	    } catch (e) {
	      console.warn('CloudBase Web SDK init failed:', e)
	    }
	  }
	})

	onShow(() => {
	  console.log('App Show')
	})

	onHide(() => {
	  console.log('App Hide')
	})
</script>

<style>
/* Global styles */
body {
  background-color: #F8F8F8;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei',
    sans-serif;
}
</style>
