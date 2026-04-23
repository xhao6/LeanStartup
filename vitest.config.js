import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unittest/**/*.test.{js,ts}', 'tests/api/**/*.test.{js,ts}'],
    // 让 vitest 能正确拦截 CJS 模块的 vi.mock
    server: {
      deps: {
        inline: ['cloudfunctions', '@cloudbase/node-sdk']
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // 覆盖 UniApp 的 vite 插件，不加载 vite.config.ts
  plugins: []
})
