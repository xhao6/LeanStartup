// src/types.ts

/** Frontmatter of a raw article (resources/raw/<dir>/article.md) */
export interface RawArticleFrontmatter {
  url: string;
  title: string;
  description?: string;
  author?: string;
  coverImage?: string;
  captured_at?: string;
  processed_at?: string; // present if already processed
}

/** A raw article ready for processing */
export interface RawArticle {
  /** 6-digit ID extracted from directory name (e.g., "100001") */
  id: string;
  /** Directory name (e.g., "100001-260421-周末写的小项目...") */
  dirName: string;
  /** Absolute path to the article directory */
  dirPath: string;
  /** Parsed frontmatter */
  frontmatter: RawArticleFrontmatter;
  /** Full markdown content (excluding frontmatter) */
  content: string;
}

/** 5-dimension score from LLM */
export interface ArticleScore {
  feasibility: number;  // 0-3
  revenue: number;      // 0-2
  timeliness: number;   // 0-2
  detail: number;       // 0-2
  userFit: number;      // 0-1
}

/** Score reasoning for each dimension */
export interface ScoreReasoning {
  feasibility: string;
  revenue: string;
  timeliness: string;
  detail: string;
  userFit: string;
}

/** JSON output from the extraction LLM call */
export interface ExtractionResult {
  sourceTitle: string;
  coreHighlight: string;
  steps: string[];
  tools: string[];
  startupCost: string;
  expectedRevenue: string;
  targetAudience: string;
  pitfalls: string[];
  score: ArticleScore;
  scoreReasoning: ScoreReasoning;
  caseStory: string;
  /** 变现周期描述 */
  cycle: string;
  /** 风险标签，最多3个 */
  riskTags: string[];
  /** 吸睛标签，恰好5个，每个2-6字，按吸睛程度排序 */
  tags: string[];
}

/** JSON output from the review LLM call */
export interface ReviewResult {
  /** The corrected extraction result (or original if no corrections needed) */
  extraction: ExtractionResult;
  /** Notes about what was corrected, empty if passed without changes */
  reviewNotes: string[];
  /** Whether the result passed review without corrections */
  passed: boolean;
}

/** CLI options */
export interface ProcessorOptions {
  ids: string[];
  rawDir: string;
  outputDir: string;
  skipReview: boolean;
  extractOnly: boolean;
}
