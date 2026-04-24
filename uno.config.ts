import { defineConfig, presetIcons, presetTypography, transformerDirectives, transformerVariantGroup } from 'unocss'
import { presetUni } from '@uni-helper/unocss-preset-uni'

export default defineConfig({
  presets: [
    presetUni(),
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  // safelist 确保动态类名被编译到 wxss
  safelist: [
    // 15种标签颜色
    'border-orange-200', 'text-orange-600', 'bg-orange-50',
    'border-blue-200', 'text-blue-600', 'bg-blue-50',
    'border-green-200', 'text-green-600', 'bg-green-50',
    'border-purple-200', 'text-purple-600', 'bg-purple-50',
    'border-pink-200', 'text-pink-600', 'bg-pink-50',
    'border-amber-200', 'text-amber-600', 'bg-amber-50',
    'border-cyan-200', 'text-cyan-600', 'bg-cyan-50',
    'border-indigo-200', 'text-indigo-600', 'bg-indigo-50',
    'border-rose-200', 'text-rose-600', 'bg-rose-50',
    'border-teal-200', 'text-teal-600', 'bg-teal-50',
    'border-lime-200', 'text-lime-600', 'bg-lime-50',
    'border-fuchsia-200', 'text-fuchsia-600', 'bg-fuchsia-50',
    'border-violet-200', 'text-violet-600', 'bg-violet-50',
    'border-sky-200', 'text-sky-600', 'bg-sky-50',
    'border-emerald-200', 'text-emerald-600', 'bg-emerald-50',
  ],
  theme: {
    colors: {
      primary: '#1A1A2E',
      secondary: '#4A4A68',
      accent: '#E94560',
      gold: '#F5A623',
      background: '#FAFAF8',
      surface: '#FFFFFF',
      border: '#E8E6E1',
      muted: '#9B9A97',
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-col-center': 'flex flex-col items-center justify-center',
    
    // Typography Shortcuts
    'text-h1': 'text-xl font-bold text-primary',       // 页面大标题 (20px)
    'text-h2': 'text-base font-bold text-gray-900',    // 卡片/列表标题 (16px)
    'text-body': 'text-sm text-gray-600 leading-relaxed', // 正文描述 (14px)
    'text-caption': 'text-xs text-gray-400',           // 辅助文字 (12px)
  },
})
