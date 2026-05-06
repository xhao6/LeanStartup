import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import Anthropic from "@anthropic-ai/sdk";
import type { SelectionCriteria } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

const CRITERIA_SYSTEM_PROMPT = `你是一个内容分析专家。我会给你一批已入选的副业案例文章的特征数据。请分析这些文章的共同模式，总结出入选标准。

请输出 JSON（包含以下字段）：
{
  "summary": "入选标准的自然语言描述（2-3句话，说明什么样的文章值得入选）",
  "coreThemes": ["主题1", "主题2", ...],
  "coreTags": ["高频标签1", "高频标签2", ...],
  "scoreDistribution": "评分分布特征描述",
  "searchKeywords": ["搜索关键词1", "搜索关键词2", ...],
  "negativeSignals": ["排除信号1", "排除信号2", ...]
}

要求：
- coreThemes: 5-8个核心主题方向
- coreTags: 10-15个高频标签
- searchKeywords: 10-20个可用于搜索发现新文章的关键词
- negativeSignals: 5-8个应该排除的信号特征
- summary 要具体到可指导后续筛选`;

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY environment variable is required");
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

interface ArticleFeatures {
  title: string;
  tags: string[];
  scoreTotal: number;
  summary: string;
  caseStoryExcerpt: string;
}

function extractSection(body: string, heading: string): string {
  const match = body.match(new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`));
  return match?.[1]?.trim() ?? "";
}

function extractFeaturesFromDir(processedDir: string): ArticleFeatures[] {
  if (!fs.existsSync(processedDir)) return [];

  const features: ArticleFeatures[] = [];
  const entries = fs.readdirSync(processedDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mdPath = path.join(processedDir, entry.name, `${entry.name}.md`);
    if (!fs.existsSync(mdPath)) continue;

    try {
      const content = fs.readFileSync(mdPath, "utf-8");
      const { data, content: body } = matter(content);

      const tagText = extractSection(body, "吸睛标签");
      const tags = tagText.split("\n").map((l: string) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean);

      const summary = extractSection(body, "核心亮点").slice(0, 200);
      const caseStoryExcerpt = extractSection(body, "案例故事").slice(0, 300);

      features.push({
        title: data.source_title ?? "",
        tags,
        scoreTotal: data.total_score ?? 0,
        summary,
        caseStoryExcerpt,
      });
    } catch { /* skip */ }
  }

  return features;
}

export async function generateCriteria(
  resourcesDir?: string,
  force = false
): Promise<SelectionCriteria | null> {
  const outputDir = resourcesDir ?? DEFAULT_CONFIG.outputDir;
  const criteriaPath = path.join(outputDir, "criteria.json");
  const processedDir = path.join(outputDir, "processed");

  if (!force && fs.existsSync(criteriaPath)) {
    return JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
  }

  const features = extractFeaturesFromDir(processedDir);
  if (features.length === 0) {
    console.log("无存量文章，跳过入选标准生成");
    return null;
  }

  console.log(`从 ${features.length} 篇存量文章中总结入选标准...`);

  const client = createClient();
  const featuresText = features
    .map((f) => `标题: ${f.title}\n标签: ${f.tags.join(", ")}\n总分: ${f.scoreTotal}\n摘要: ${f.summary}\n案例片段: ${f.caseStoryExcerpt}`)
    .join("\n---\n");

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 2048,
    system: CRITERIA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `以下是 ${features.length} 篇已入选文章的特征：\n\n${featuresText}` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("LLM 响应无文本块");

const jsonBlock = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!jsonBlock) {
    console.error("LLM 响应原文（前500字）：", textBlock.text.slice(0, 500));
    throw new Error("无法解析 LLM 响应中的 JSON");
  }

  const criteria: SelectionCriteria = {
    ...JSON.parse(jsonBlock[1].trim()),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(criteriaPath, JSON.stringify(criteria, null, 2), "utf-8");
  console.log(`入选标准已保存到 ${criteriaPath}`);
  return criteria;
}
