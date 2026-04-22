import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unittest/**/*.test.js'],
    // 让 vitest 能正确拦截 CJS 模块的 vi.mock
    server: {
      deps: {
        inline: ['cloudfunctions', '@cloudbase/node-sdk']
      }
    }
  },
  // 覆盖 UniApp 的 vite 插件，不加载 vite.config.ts
  plugins: []
})
