// Colors matching DESIGN.md
export const COLORS = {
  PRIMARY: '#1A1A2E',
  SECONDARY: '#4A4A68',
  ACCENT: '#E94560',
  GOLD: '#F5A623',
  BG: '#FAFAF8',
  SURFACE: '#FFFFFF',
  BORDER: '#E8E6E1',
  MUTED: '#9B9A97',
  SUCCESS: '#059669',
  WARNING: '#F59E0B',
  ERROR: '#DC2626',
  INFO: '#0369A1'
} as const

// Morandi tag colors (5 variants)
export const MORANDI_TAGS = [
  { name: 'case-tag-mor-1', bg: '#E8D5C4', text: '#5D4E37' },
  { name: 'case-tag-mor-2', bg: '#D4E2D4', text: '#3D5C3D' },
  { name: 'case-tag-mor-3', bg: '#D5D4E2', text: '#4A4D6E' },
  { name: 'case-tag-mor-4', bg: '#E2D4D5', text: '#6E4A4D' },
  { name: 'case-tag-mor-5', bg: '#DFDBD0', text: '#5C5A4F' }
] as const

// Cost tag colors
export const COST_TAG_COLORS: Record<string, { bg: string; text: string }> = {
  '零成本': { bg: '#D1FAE5', text: '#059669' },
  '低门槛': { bg: '#DBEAFE', text: '#2563EB' }
}

// Rank badge gradients
export const RANK_BADGE_COLORS: Record<number, string> = {
  1: 'linear-gradient(180deg, #FBBF24, #F97316)',
  2: 'linear-gradient(180deg, #94A3B8, #64748B)',
  3: 'linear-gradient(180deg, #D4A574, #B8956C)'
}

// Score dimensions (matching cloud function Case model)
export const SCORE_DIMENSIONS = [
  { key: 'score_feasibility', label: '落地可行性', max: 20 },
  { key: 'score_profit', label: '收益潜力', max: 20 },
  { key: 'score_timeliness', label: '时效性', max: 20 },
  { key: 'score_detail', label: '实操细节', max: 20 },
  { key: 'score_fitness', label: '用户适配度', max: 20 }
] as const

// Cache config
export const CACHE_PREFIX = 'leanstartup_cache_'
export const CACHE_TTL = {
  HOUR: 3600_000,
  DAY: 86400_000,
  WEEK: 604800_000
} as const

// Subscribe template ID (configure in WeChat MP platform)
export const SUBSCRIBE_TEMPLATE_ID = 'POdB9EzzVCyvfHrJSgmG8vnXLkKiiIWPRC35qjv4wH4'

// Page size
export const PAGE_SIZE = 20

// Cloud function names
export const CF = {
  GET_DAILY_PICK: 'getDailyPick',
  GET_CASE_DETAIL: 'getCaseDetail',
  TOGGLE_COLLECTION: 'toggleCollection',
  GET_USER_COLLECTIONS: 'getUserCollections',
  TRACK_EVENT: 'trackEvent',
  SUBSCRIBE_MESSAGE: 'subscribeMessage'
} as const
