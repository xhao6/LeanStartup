/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明 wx 全局对象，用于微信小程序环境
declare const wx: {
  cloud: {
    init: (options?: { env?: string; traceUser?: boolean }) => void
    database: (options?: { env?: string }) => any
    callFunction: (options: { name: string; data?: any }) => Promise<any>
    [key: string]: any
  }
  [key: string]: any
}
