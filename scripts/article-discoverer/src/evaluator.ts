import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Anthropic from "@anthropic-ai/sdk";
import type { CandidateArticle, EvaluatedArticle, SelectionCriteria } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";
import { generateCriteria } from "./criteria.js";
import { loadCandidates } from "./dedup.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY environment variable is required");
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

function buildSystemPrompt(criteria: SelectionCriteria): string {
  return `你是一个内容筛选专家。根据以下入选标准，评估候选文章是否值得入选。

## 入选标准
${criteria.summary}

## 核心主题
${criteria.coreThemes.join("、")}

## 评分参考
${criteria.scoreDistribution}

## 排除信号（出现以下特征的应排除）
${criteria.negativeSignals.map((s) => `- ${s}`).join("\n")}

## 输出格式
对每篇文章输出 JSON 数组，每个元素包含：
{
  "url": "原始URL",
  "pass": true/false,
  "score": 1-10的相关度评分,
  "reason": "一句话说明入选或排除理由"
}

只输出 JSON 数组，不要其他内容。`;
}

async function evaluateBatch(
  client: Anthropic,
  criteria: SelectionCriteria,
  batch: CandidateArticle[],
): Promise<EvaluatedArticle[]> {
  const articlesText = batch
    .map(
      (a, i) =>
        `[${i + 1}] 标题: ${a.title}\n    摘要: ${a.excerpt}\n    日期: ${a.date}\n    URL: ${a.url}`,
    )
    .join("\n\n");

  let retries = 0;
  while (retries < 3) {
    try {
      const response = await client.messages.create({
        model: MINIMAX_MODEL,
        max_tokens: 2048,
        system: buildSystemPrompt(criteria),
        messages: [
          {
            role: "user",
            content: `请评估以下 ${batch.length} 篇候选文章：\n\n${articlesText}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("LLM 响应无文本块");

const codeBlock = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      let jsonText: string;
      if (codeBlock) {
        jsonText = codeBlock[1].trim();
      } else {
        // Fallback: bare JSON array without code block
        const bare = textBlock.text.match(/(\[[\s\S]*\])/);
        if (!bare) {
          console.error("LLM 响应原文（前500字）：", textBlock.text.slice(0, 500));
          throw new Error("无法解析 LLM 响应中的 JSON");
        }
        jsonText = bare[1].trim();
      }

      const parsed: EvaluatedArticle[] = JSON.parse(jsonText);

      // Validate: map results back to input batch, fill missing entries
      return batch.map((article) => {
        const found = parsed.find((e) => e.url === article.url);
        return (
          found ?? {
            url: article.url,
            pass: false,
            score: 0,
            reason: "LLM 未返回评估结果",
          }
        );
      });
    } catch (err) {
      retries++;
      if (retries >= 3) throw err;
      const delay = 2000 * Math.pow(2, retries - 1);
      console.log(`  评估批次重试 ${retries}/3 (${delay}ms)...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return batch.map((article) => ({
    url: article.url,
    pass: false,
    score: 0,
    reason: "重试耗尽",
  }));
}

const DEFAULT_FALLBACK_CRITERIA: SelectionCriteria = {
  summary: "适合普通用户的副业、创业、赚钱案例，有实操步骤",
  coreThemes: ["副业", "创业", "自媒体"],
  coreTags: [],
  scoreDistribution: "无参考",
  searchKeywords: [],
  negativeSignals: ["纯广告", "无实操步骤", "标题党"],
  generatedAt: new Date().toISOString(),
};

interface EvaluateOptions {
  refreshCriteria?: boolean;
  config?: typeof DEFAULT_CONFIG;
}

export async function evaluate(options: EvaluateOptions = {}): Promise<void> {
  const cfg = options.config ?? DEFAULT_CONFIG;
  const candidatesPath = path.join(cfg.outputDir, "candidates.json");

  if (!fs.existsSync(candidatesPath)) {
    console.error("错误：candidates.json 不存在，请先运行 scan");
    process.exit(1);
  }

  const candidates = loadCandidates(candidatesPath);
  if (candidates.length === 0) {
    console.log("无候选文章可评估");
    return;
  }

  const criteria = await generateCriteria(cfg.outputDir, options.refreshCriteria);
  if (!criteria) {
    console.log("无入选标准，将仅基于标题和摘要做相关性判断");
  }
  const activeCriteria = criteria ?? DEFAULT_FALLBACK_CRITERIA;

  const client = createClient();
  const batchSize = cfg.batchSize;
  const allEvaluated: EvaluatedArticle[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    console.log(
      `评估批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)} (${batch.length} 篇)...`,
    );

    const results = await evaluateBatch(client, activeCriteria, batch);
    allEvaluated.push(...results);

    if (i + batchSize < candidates.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const passed = allEvaluated.filter((e) => e.pass).sort((a, b) => b.score - a.score);

  const urlsPath = path.join(cfg.outputDir, "discovered-urls.txt");
  fs.writeFileSync(urlsPath, passed.map((e) => e.url).join("\n"), "utf-8");

  const metadataPath = path.join(cfg.outputDir, "discovered-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(passed, null, 2), "utf-8");

  console.log(`\n评估完成：${passed.length}/${candidates.length} 篇入选`);
  console.log(`URL 列表：${urlsPath}`);
  console.log(`元数据：${metadataPath}`);
}
