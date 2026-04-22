// src/extractor.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult } from "./types.js";
import { scoringRubricText, clampScore } from "./scorer.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

const EXTRACTION_SYSTEM_PROMPT = `你是一位专业的副业案例分析师。你的任务是分析副业/搞钱类文章，提取结构化信息并进行评分。

## 评分体系（总分10分）
${scoringRubricText()}

## 输出要求
1. 仔细阅读原文，提取以下7大字段
2. 去除所有广告/拉群/关注/求转发等无关内容
3. 仅从原文提取信息，不要编造
4. 如果原文信息不足，对应字段填写"原文未提及"，对应维度给低分
5. sourceTitle 必须从原文标题提取
6. caseStory 用300-800字的叙事手法详述案例故事，开头用吸引读者的钩子切入，保留关键数据和转折点
7. 必须严格按JSON格式输出，不要输出其他内容
8. tags 必须恰好5个标签，按吸睛程度排序（第一个最抓眼球），每个标签2-6个字，必须有辨识度能区分于其他案例，禁止泛标签（如"副业"、"赚钱"、"项目"、"推荐"）

## JSON格式
{
  "sourceTitle": "原文标题",
  "coreHighlight": "1-3句概括案例核心价值",
  "steps": ["步骤1", "步骤2"],
  "tools": ["工具1", "工具2"],
  "startupCost": "启动成本（含具体金额）",
  "expectedRevenue": "预期收益（含具体金额）",
  "targetAudience": "适合人群",
  "pitfalls": ["避坑点1", "避坑点2"],
  "score": {
    "feasibility": 0,
    "revenue": 0,
    "timeliness": 0,
    "detail": 0,
    "userFit": 0
  },
  "scoreReasoning": {
    "feasibility": "打分理由",
    "revenue": "打分理由",
    "timeliness": "打分理由",
    "detail": "打分理由",
    "userFit": "打分理由"
  },
  "caseStory": "300-800字案例故事，开头有钩子",
  "cycle": "变现周期描述，如'1-2周见收益'",
  "riskTags": ["风险标签1", "风险标签2"],
  "tags": ["吸睛标签1", "吸睛标签2", "吸睛标签3", "吸睛标签4", "吸睛标签5"]
}`;

/**
 * Call MiniMax LLM to extract structured data and score from an article.
 */
export async function extractArticle(
  articleContent: string
): Promise<ExtractionResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `请分析以下副业案例文章并提取结构化信息：\n\n${articleContent}`,
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM response contains no text block");
  }

  const rawText = textBlock.text;

  // Parse JSON from response (handle potential markdown code blocks)
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from LLM response");
  }

  const parsed: ExtractionResult = JSON.parse(jsonMatch[1].trim());

  // Clamp scores to valid ranges
  parsed.score = clampScore(parsed.score);

  // Ensure arrays
  if (!Array.isArray(parsed.steps)) parsed.steps = [];
  if (!Array.isArray(parsed.tools)) parsed.tools = [];
  if (!Array.isArray(parsed.pitfalls)) parsed.pitfalls = [];
  if (!Array.isArray(parsed.riskTags)) parsed.riskTags = [];
  if (!Array.isArray(parsed.tags)) parsed.tags = [];

  return parsed;
}
