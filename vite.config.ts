import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'

// 构建完成后复制 static 目录（小程序 tabBar 图标等）
function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      // 复制 static/tabbar 目录
      const tabbarSrc = resolve(__dirname, 'src/static/tabbar')
      const tabbarDest = resolve(__dirname, 'dist/build/mp-weixin/static/tabbar')
      if (existsSync(tabbarSrc)) {
        if (!existsSync(tabbarDest)) {
          mkdirSync(tabbarDest, { recursive: true })
        }
        const files = readdirSync(tabbarSrc)
        for (const file of files) {
          if (file.endsWith('.png') || file.endsWith('.svg')) {
            copyFileSync(join(tabbarSrc, file), join(tabbarDest, file))
          }
        }
        console.log('[copy-static] tabbar icons copied')
      }

      // 复制 static/images 目录
      const imagesSrc = resolve(__dirname, 'static/images')
      const imagesDest = resolve(__dirname, 'dist/build/mp-weixin/static/images')
      if (existsSync(imagesSrc)) {
        if (!existsSync(imagesDest)) {
          mkdirSync(imagesDest, { recursive: true })
        }
        const files = readdirSync(imagesSrc)
        for (const file of files) {
          copyFileSync(join(imagesSrc, file), join(imagesDest, file))
        }
        console.log('[copy-static] images copied')
      }

      // 创建空的 mock.js 占位符（避免微信开发者工具报错）
      const dataDir = resolve(__dirname, 'dist/build/mp-weixin/data')
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true })
      }
      const mockJsPath = join(dataDir, 'mock.js')
      if (!existsSync(mockJsPath)) {
        require('fs').writeFileSync(mockJsPath, '// mock placeholder\n', 'utf-8')
      }

      // 删除 wd-icon.wxss 中的 CDN @font-face（字体已用 base64 内嵌到 icon-local.scss）
      const destWdIconWxss = resolve(__dirname, 'dist/build/mp-weixin/node-modules/wot-design-uni/components/wd-icon/wd-icon.wxss')
      if (existsSync(destWdIconWxss)) {
        let content = require('fs').readFileSync(destWdIconWxss, 'utf-8')
        content = content.replace(/@font-face\{[^}]+\}/g, '')
        require('fs').writeFileSync(destWdIconWxss, content, 'utf-8')
        console.log('[copy-static] Cleaned wd-icon.wxss (CDN font-face removed)')
      }

      console.log('[copy-static] done')
    }
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    uni(),
    UnoCSS(),
    copyStaticAssets(),
    AutoImport({
      imports: ['vue', 'uni-app', 'pinia'],
      dts: 'src/auto-import.d.ts',
    }),
    Components({
      dts: 'src/components.d.ts',
      dirs: ['src/components'],
    }),
  ],
})
