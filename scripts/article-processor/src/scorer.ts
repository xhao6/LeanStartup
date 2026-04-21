// src/scorer.ts
import type { ArticleScore } from "./types.js";

export interface ScoreDimension {
  key: keyof ArticleScore;
  label: string;
  max: number;
  criteria: string;
}

/** PRD-defined scoring dimensions */
export const SCORE_DIMENSIONS: ScoreDimension[] = [
  {
    key: "feasibility",
    label: "落地可行性",
    max: 3,
    criteria: "操作难度（低=高分）、启动成本（≤500元加分）、是否需要专业技能（不需要=高分）",
  },
  {
    key: "revenue",
    label: "收益潜力",
    max: 2,
    criteria: "收益稳定性、变现周期（≤7天加分）、收益上限",
  },
  {
    key: "timeliness",
    label: "时效性",
    max: 2,
    criteria: "适配当前市场环境、是否有可持续性、当下热门方向加分",
  },
  {
    key: "detail",
    label: "实操细节",
    max: 2,
    criteria: "操作步骤完整性、避坑提示清晰度、工具可获取性",
  },
  {
    key: "userFit",
    label: "用户适配度",
    max: 1,
    criteria: "是否适合普通用户（无需专业资质、无需大量时间）",
  },
];

/** Maximum total score across all dimensions */
export const MAX_TOTAL_SCORE = SCORE_DIMENSIONS.reduce((sum, d) => sum + d.max, 0); // 10

/**
 * Validate that all score values are within their allowed ranges.
 * Returns an array of error messages (empty if valid).
 */
export function validateScore(score: ArticleScore): string[] {
  const errors: string[] = [];
  for (const dim of SCORE_DIMENSIONS) {
    const val = score[dim.key];
    if (typeof val !== "number" || isNaN(val)) {
      errors.push(`${dim.label}(${dim.key}): not a number`);
    } else if (val < 0) {
      errors.push(`${dim.label}(${dim.key}): ${val} < 0`);
    } else if (val > dim.max) {
      errors.push(`${dim.label}(${dim.key}): ${val} > ${dim.max}`);
    }
  }
  return errors;
}

/**
 * Clamp all score values to their allowed ranges.
 */
export function clampScore(score: ArticleScore): ArticleScore {
  const clamped = { ...score };
  for (const dim of SCORE_DIMENSIONS) {
    const val = clamped[dim.key];
    clamped[dim.key] = Math.max(0, Math.min(dim.max, typeof val === "number" && !isNaN(val) ? val : 0));
  }
  return clamped;
}

/**
 * Calculate total score.
 */
export function totalScore(score: ArticleScore): number {
  return SCORE_DIMENSIONS.reduce((sum, d) => sum + (score[d.key] ?? 0), 0);
}

/**
 * Build a human-readable scoring rubric string for the LLM prompt.
 */
export function scoringRubricText(): string {
  return SCORE_DIMENSIONS.map(
    (d) => `- ${d.label}(${d.key}): 0-${d.max}分, 标准: ${d.criteria}`
  ).join("\n");
}
