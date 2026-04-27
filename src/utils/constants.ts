// 常量
export const COLORS = {
  PRIMARY: '#1A1A2E',
  SECONDARY: '#4A4A68',
  ACCENT: '#E94560',
  GOLD: '#F5A623',
  BG: '#FAFAF8',
  SURFACE: '#FFFFFF',
  BORDER: '#E8E6E1',
  MUTED: '#9B9A97',
}

export const TAG_COLORS = [
  'tag-pink', 'tag-yellow', 'tag-blue', 'tag-green',
  'tag-purple', 'tag-mint', 'tag-peach', 'tag-lavender',
  'tag-coral', 'tag-lemon', 'tag-sky', 'tag-rose',
  'tag-olive', 'tag-wine'
]

export const MORANDI_TAGS = [
  { bg: '#E8D5C4', text: '#5D4E37' },
  { bg: '#D4E2D4', text: '#3D5C3D' },
  { bg: '#D5D4E2', text: '#4A4D6E' },
  { bg: '#E2D4D5', text: '#6E4A4D' },
  { bg: '#DFDBD0', text: '#5C5A4F' },
]

export const RANK_COLORS: Record<number, string> = {
  1: 'linear-gradient(180deg, #FBBF24, #F97316)',
  2: 'linear-gradient(180deg, #94A3B8, #64748B)',
  3: 'linear-gradient(180deg, #D4A574, #B8956C)',
}

export const CACHE_KEYS = {
  DAILY_PICK: 'daily-pick',
  USER_INFO: 'user-info',
}

export const CACHE_TTL = {
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
}
