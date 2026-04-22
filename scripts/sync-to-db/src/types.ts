// scripts/sync-to-db/src/types.ts

/** Case 集合记录格式，匹配 syncCaseData 云函数入参 */
export interface CaseRecord {
  id: string;
  title: string;
  source_account: string;
  source_url: string;
  summary: string;
  score_total: number;
  score_feasibility: number;
  score_profit: number;
  score_timeliness: number;
  score_detail: number;
  score_fitness: number;
  cost: string;
  expected_revenue: string;
  cycle: string;
  steps: { step: string; order: number }[];
  tools: { name: string; desc: string }[];
  pitfalls: string;
  suitable_for: string;
  risk_tags: string[];
  tags: string[];
  case_story: string;
  status: string;
}

/** CLI 选项 */
export interface SyncOptions {
  ids: string[];
  dryRun: boolean;
  processedDir: string;
}