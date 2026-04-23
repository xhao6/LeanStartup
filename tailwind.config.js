/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1A1A2E',
        secondary: '#4A4A68',
        accent: '#E94560',
        gold: '#F5A623',
        bg: '#FAFAF8',
        surface: '#FFFFFF',
        border: '#E8E6E1',
        muted: '#9B9A97',
      },
      fontFamily: {
        display: ['Noto Serif SC', 'Georgia', 'serif'],
        body: ['Noto Sans SC', 'PingFang SC', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(26,26,46,0.06)',
        'card-hover': '0 8px 32px rgba(26,26,46,0.12)',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
