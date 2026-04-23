/**
 * Pure logic functions for Vue components.
 * Extracted to enable TDD testing without DOM/UniApp rendering layer.
 */
import { MORANDI_TAGS, RANK_BADGE_COLORS, COST_TAG_COLORS } from '@/utils/constants'

// ─── ScoreBadge helpers ───────────────────────────────────────────────

export type ScoreSize = 'sm' | 'md' | 'lg'

const SCORE_FONT_SIZE: Record<ScoreSize, string> = {
  sm: '14px',
  md: '18px',
  lg: '48px'
} as const

/** Returns the CSS font-size value for a given badge size. */
export function getScoreFontSize(size: ScoreSize): string {
  return SCORE_FONT_SIZE[size]
}

/** Formats a raw score number for display (e.g. 85 -> "85"). */
export function formatScoreDisplay(score: number): string {
  if (!Number.isFinite(score)) return '--'
  return Math.round(score).toString()
}

// ─── TagMor helpers ───────────────────────────────────────────────────

/** Returns the Morandi color config for a given index, clamped to 0-4. */
export function getMorandiColor(index: number): { bg: string; text: string } {
  const clamped = Math.max(0, Math.min(index, MORANDI_TAGS.length - 1))
  const tag = MORANDI_TAGS[clamped]
  return { bg: tag.bg, text: tag.text }
}

/** Distribute N items across Morandi color indices (round-robin). */
export function distributeTagColors(count: number, startOffset = 0): number[] {
  return Array.from({ length: count }, (_, i) => (i + startOffset) % MORANDI_TAGS.length)
}

// ─── CaseCard helpers ─────────────────────────────────────────────────

export interface CaseData {
  id: string
  title: string
  summary: string
  score_total: number
  cost: string
  source_account: string
  suitable_for: string[]
}

/** Returns the rank badge gradient string, or undefined for rank > 3. */
export function getRankGradient(rank: number): string | undefined {
  return RANK_BADGE_COLORS[rank]
}

/** Whether the rank qualifies for a gradient badge (top 3). */
export function isTopRank(rank: number): boolean {
  return rank >= 1 && rank <= 3
}

/** Returns cost tag colors { bg, text } based on the cost string. */
export function getCostTagStyle(cost: string): { bg: string; text: string } {
  return COST_TAG_COLORS[cost] ?? { bg: '#FAFAF8', text: '#4A4A68' }
}

/** Parses `suitable_for` (may be a comma-separated string or array) into a tag list. */
export function parseSuitableFor(raw: string | string[] | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') return raw.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
  return []
}
