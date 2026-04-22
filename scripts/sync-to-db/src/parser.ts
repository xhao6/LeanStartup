// scripts/sync-to-db/src/parser.ts
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { CaseRecord } from "./types.js";

/** MD body section 的解析结果 */
interface ParsedSections {
  案例故事?: string;
  核心亮点?: string;
  操作步骤?: string;
  所需工具?: string;
  启动成本?: string;
  预期收益?: string;
  适合人群?: string;
  避坑指南?: string;
  变现周期?: string;
  风险标签?: string;
  吸睛标签?: string;
}

/**
 * 从 MD 文件解析出 CaseRecord
 */
export function parseProcessedMd(filePath: string): CaseRecord {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data: fm, content } = matter(raw);

  const sections = parseBodySections(content);

  const scores = fm.scores || {};

  return {
    id: String(fm.id),
    title: fm.source_title || "",
    source_account: fm.source_author || "",
    source_url: fm.source_url || "",
    summary: truncate(sections["核心亮点"] || "", 200),
    case_story: sections["案例故事"] || "",
    score_total: Number(fm.total_score) || 0,
    score_feasibility: Number(scores.feasibility) || 0,
    score_profit: Number(scores.revenue) || 0,
    score_timeliness: Number(scores.timeliness) || 0,
    score_detail: Number(scores.detail) || 0,
    score_fitness: Number(scores.userFit) || 0,
    cost: sections["启动成本"] || "",
    expected_revenue: sections["预期收益"] || "",
    cycle: sections["变现周期"] || "",
    steps: parseSteps(sections["操作步骤"] || ""),
    tools: parseTools(sections["所需工具"] || ""),
    pitfalls: sections["避坑指南"] || "",
    suitable_for: sections["适合人群"] || "",
    risk_tags: parseListItems(sections["风险标签"] || ""),
    tags: parseListItems(sections["吸睛标签"] || ""),
    status: "published",
  };
}

/**
 * 将 MD body 按 ## 标题拆分为 section map
 */
function parseBodySections(body: string): ParsedSections {
  const result: ParsedSections = {};
  // 先去掉 frontmatter（---...---之间的内容）
  const bodyWithoutFrontmatter = body.replace(/^---[\s\S]*?---\n?/, "");
  const parts = bodyWithoutFrontmatter.split(/^## /m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) continue;
    const title = part.slice(0, newlineIdx).trim();
    const content = part.slice(newlineIdx + 1).trim();
    if (title in { 案例故事:1, 核心亮点:1, 操作步骤:1, 所需工具:1, 启动成本:1, 预期收益:1, 适合人群:1, 避坑指南:1, 变现周期:1, 风险标签:1, 吸睛标签:1 }) {
      (result as Record<string, string>)[title] = content;
    }
  }

  return result;
}

/**
 * 解析步骤列表： "1. 步骤文本\n2. 步骤文本" → [{step, order}]
 */
function parseSteps(text: string): { step: string; order: number }[] {
  const steps: { step: string; order: number }[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\d+\.\s*(.+)/);
    if (m) {
      steps.push({ step: m[1].trim(), order: steps.length + 1 });
    }
  }
  return steps;
}

/**
 * 解析工具列表： "- 工具名（说明）" → [{name, desc}]
 */
function parseTools(text: string): { name: string; desc: string }[] {
  const tools: { name: string; desc: string }[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^-\s*(.+?)[（(](.+?)[)）]$/);
    if (m) {
      tools.push({ name: m[1].trim(), desc: m[2].trim() });
    } else {
      const m2 = line.match(/^-\s*(.+)/);
      if (m2) {
        tools.push({ name: m2[1].trim(), desc: "" });
      }
    }
  }
  return tools;
}

/**
 * 解析列表字段： "- 项目" → ["项目"]
 */
function parseListItems(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^-\s*(.+)/);
    if (m) {
      items.push(m[1].trim());
    }
  }
  return items;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen);
}

/**
 * 扫描 processed 目录下的所有 MD 文件
 */
export function scanProcessedDir(
  processedDir: string,
  filterIds?: string[]
): { id: string; filePath: string }[] {
  if (!fs.existsSync(processedDir)) {
    console.error(`Processed directory not found: ${processedDir}`);
    return [];
  }

  const entries = fs.readdirSync(processedDir, { withFileTypes: true });
  const files: { id: string; filePath: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(\d{6})-/);
    if (!match) continue;

    const id = match[1];
    if (filterIds && filterIds.length > 0 && !filterIds.includes(id)) continue;

    const mdPath = path.join(processedDir, entry.name, `${entry.name}.md`);
    if (!fs.existsSync(mdPath)) continue;

    files.push({ id, filePath: mdPath });
  }

  files.sort((a, b) => a.id.localeCompare(b.id));
  return files;
}