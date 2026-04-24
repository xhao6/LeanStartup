import { createSSRApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import 'virtual:uno.css'
import './styles/icon-local.scss'
import './styles/global.scss'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  return {
    app,
    pinia,
  }
}
