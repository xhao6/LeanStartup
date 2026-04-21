// src/formatter.ts
import type { ExtractionResult, RawArticle } from "./types.js";
import { totalScore } from "./scorer.js";

/**
 * Format an extraction result into the structured MD output.
 * Output format matches the PRD-defined template.
 */
export function formatProcessedMarkdown(
  article: RawArticle,
  extraction: ExtractionResult
): string {
  const total = totalScore(extraction.score);
  const timestamp = new Date().toISOString();

  // Frontmatter
  const frontmatter = [
    `id: "${article.id}"`,
    `source_title: "${escapeYaml(extraction.sourceTitle || article.frontmatter.title)}"`,
    `source_url: "${article.frontmatter.url}"`,
    `source_author: "${escapeYaml(article.frontmatter.author || "")}"`,
    `processed_at: "${timestamp}"`,
    `total_score: ${total}`,
    `scores:`,
    `  feasibility: ${extraction.score.feasibility}`,
    `  revenue: ${extraction.score.revenue}`,
    `  timeliness: ${extraction.score.timeliness}`,
    `  detail: ${extraction.score.detail}`,
    `  userFit: ${extraction.score.userFit}`,
  ].join("\n");

  // Body sections
  const sections: string[] = [];

  // Case story
  sections.push(`## 案例故事\n\n${extraction.caseStory}`);

  // Core highlight
  sections.push(`## 核心亮点\n\n${extraction.coreHighlight}`);

  // Steps
  if (extraction.steps.length > 0) {
    const stepsList = extraction.steps
      .map((s, i) => `${i + 1}. ${s}`)
      .join("\n");
    sections.push(`## 操作步骤\n\n${stepsList}`);
  }

  // Tools
  if (extraction.tools.length > 0) {
    const toolsList = extraction.tools.map((t) => `- ${t}`).join("\n");
    sections.push(`## 所需工具\n\n${toolsList}`);
  }

  // Startup cost
  sections.push(`## 启动成本\n\n${extraction.startupCost}`);

  // Expected revenue
  sections.push(`## 预期收益\n\n${extraction.expectedRevenue}`);

  // Target audience
  sections.push(`## 适合人群\n\n${extraction.targetAudience}`);

  // Pitfalls
  if (extraction.pitfalls.length > 0) {
    const pitfallsList = extraction.pitfalls.map((p) => `- ${p}`).join("\n");
    sections.push(`## 避坑指南\n\n${pitfallsList}`);
  }

  return `---\n${frontmatter}\n---\n\n${sections.join("\n\n")}\n`;
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"');
}
