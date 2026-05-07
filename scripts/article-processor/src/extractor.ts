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

## 严格字段长度约束（必须遵守）
- startupCost（启动成本）：严格不超过16字，如"零成本"、"500元内"、"1000-2000元"
- expectedRevenue（预期收益）：严格不超过16字，如"5000+/月"、"100-500/单"、"月入3000-8000"
- cycle（变现周期）：严格不超过16字，如"1-2周"、"3-6个月"、"7-14天见收益"
- targetAudience（适合人群）：严格不超过16字，如"职场人"、"学生/宝妈"、"有基础办公软件能力"

## Tools 格式要求
- 格式：数组元素为字符串 "<工具名（描述）>"
- 工具名不超过10字，描述不超过10字
- 样例：
  * "n8n（开源自动化平台）"
  * "Make（Integromat）"
  * "Dify（AI应用开发平台）"
  * "Cursor Pro（AI编程）"
  * "ChatGPT Plus（AI助手）"

## JSON格式
{
  "sourceTitle": "原文标题",
  "coreHighlight": "1-3句概括案例核心价值",
  "steps": ["步骤1", "步骤2"],
  "tools": ["工具名（描述）", "工具名（描述）"],
  "startupCost": "启动成本（≤16字）",
  "expectedRevenue": "预期收益（≤16字）",
  "targetAudience": "适合人群（≤16字）",
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
  "cycle": "变现周期（≤16字）",
  "riskTags": ["风险标签1", "风险标签2"],
  "tags": ["吸睛标签1", "吸睛标签2", "吸睛标签3", "吸睛标签4", "吸睛标签5"]
}

## 完整输出样例（仅供参考格式）
{
  "sourceTitle": "我在闲鱼倒卖虚拟资料，一个月赚了8000+",
  "coreHighlight": "通过信息差倒卖虚拟教程，零成本启动，利用闲鱼流量变现",
  "steps": [
    "收集各平台优质教程资源",
    "整理成主题合集（如考研、考证）",
    "在闲鱼发布商品页面",
    "发货时提供网盘链接"
  ],
  "tools": [
    "阿里云盘（免费存储）",
    "夸克网盘（大容量存储）",
    "闲鱼APP（销售平台）"
  ],
  "startupCost": "零成本",
  "expectedRevenue": "5000+/月",
  "targetAudience": "职场人/学生",
  "pitfalls": ["注意版权风险，优先选择公开资源", "初期需要花时间整理资源"],
  "score": {
    "feasibility": 3,
    "revenue": 2,
    "timeliness": 2,
    "detail": 2,
    "userFit": 1
  },
  "scoreReasoning": {
    "feasibility": "操作简单，零成本启动，无需专业技能",
    "revenue": "单笔利润20-50元，月销100+单可达5000+",
    "timeliness": "虚拟资料是长期需求，当下热门",
    "detail": "步骤清晰，工具易获取",
    "userFit": "适合普通用户，无需特殊资质"
  },
  "caseStory": "去年6月我开始在闲鱼卖虚拟资料，第一个月只赚了800块。后来我发现考研资料最火，就去各个免费渠道收集整理，做成主题合集。现在每天花2小时维护店铺，上个月收入突破8000。关键是要选对品类，考研、考证、技能类的最好卖。",
  "cycle": "1-2周",
  "riskTags": ["版权风险", "需要持续更新"],
  "tags": ["闲鱼副业", "零成本", "虚拟资源", "考研资料", "信息差变现"]
}`;

const JSON_FIX_PROMPT = `你是一个JSON修复专家。用户的LLM输出无法被解析为有效JSON，请修复它。

## 任务
1. 读取下方有问题的原始输出
2. 尽可能保留原有数据，只修复JSON语法错误
3. 修复规则：
   - 修复未闭合的引号、括号
   - 修复末尾多余的逗号
   - 修复Unicode转义问题（如\\u4e00）
   - 处理换行符、转义符等特殊字符
   - 移除markdown代码块标记
4. 输出必须是有效JSON，不要添加任何解释

## 注意事项
- 不要改变原始数据的语义
- 对于无法确定的值，使用null而非空字符串
- 如果原输出缺失关键字段，不要凭空添加

请修复以下JSON：`;

/**
 * Extract text from LLM response, handling potential code blocks.
 */
function extractTextFromResponse(response: Anthropic.Message): string {
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM response contains no text block");
  }
  return textBlock.text;
}

/**
 * Parse JSON from text, handling markdown code blocks.
 */
function parseJsonFromText(text: string): ExtractionResult | null {
  // Try to extract JSON from code blocks first
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  // Try direct JSON parse
  try {
    return validateExtractionResult(JSON.parse(jsonStr));
  } catch {
    // Try to extract raw JSON object
    const rawMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (rawMatch) {
      try {
        return validateExtractionResult(JSON.parse(rawMatch[1]));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Validate that parsed object has required ExtractionResult fields.
 * Returns null if validation fails, otherwise returns the validated object.
 */
function validateExtractionResult(obj: unknown): ExtractionResult | null {
  if (!obj || typeof obj !== "object") return null;

  const required = [
    "sourceTitle",
    "coreHighlight",
    "steps",
    "tools",
    "startupCost",
    "expectedRevenue",
    "targetAudience",
    "pitfalls",
    "score",
    "caseStory",
    "cycle",
    "riskTags",
    "tags",
  ];

  for (const field of required) {
    if (!(field in obj)) return null;
  }

  // Validate score sub-object
  const score = (obj as ExtractionResult).score;
  if (!score || typeof score !== "object") return null;
  const scoreFields = ["feasibility", "revenue", "timeliness", "detail", "userFit"];
  for (const f of scoreFields) {
    if (!(f in score) || typeof score[f as keyof typeof score] !== "number") return null;
  }

  return obj as ExtractionResult;
}

/**
 * Call LLM to fix malformed JSON.
 */
async function fixJsonWithLLM(
  client: Anthropic,
  rawText: string,
  attempt: number
): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 8192,
    system: JSON_FIX_PROMPT,
    messages: [
      {
        role: "user",
        content: `原始LLM输出（解析失败第${attempt}次）：\n\n${rawText.slice(0, 8000)}`,
      },
    ],
  });

  const fixedText = extractTextFromResponse(response);
  const parsed = parseJsonFromText(fixedText);

  if (!parsed) {
    throw new Error(`JSON fix attempt ${attempt} failed: still not valid JSON`);
  }

  return parsed;
}

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

  const rawText = extractTextFromResponse(response);
  let parsed = parseJsonFromText(rawText);

  // Retry JSON fixing up to 2 times
  if (!parsed) {
    console.log("    JSON parse failed, attempting repair...");
    try {
      parsed = await fixJsonWithLLM(client, rawText, 1);
    } catch {
      try {
        parsed = await fixJsonWithLLM(client, rawText, 2);
      } catch (err) {
        throw new Error(`JSON parse error after 2 repair attempts: ${(err as Error).message}`);
      }
    }
  }

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
