// src/index.ts
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { Command } from "commander";
import type { RawArticle, RawArticleFrontmatter, ProcessorOptions } from "./types.js";
import { validateScore } from "./scorer.js";
import { extractArticle } from "./extractor.js";
import { reviewExtraction } from "./reviewer.js";
import { formatProcessedMarkdown } from "./formatter.js";

// Load .env from project root (walk up from cwd or script location)
function findProjectRoot(): string {
  // Try cwd first
  let dir = process.cwd();
  if (fs.existsSync(path.join(dir, ".env"))) return dir;
  // Fall back to walking up from script location
  dir = path.resolve(import.meta.dirname ?? ".", "../..");
  if (fs.existsSync(path.join(dir, ".env"))) return dir;
  return process.cwd();
}
const envPath = path.join(findProjectRoot(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const DEFAULT_RAW_DIR = path.resolve("resources/raw");
const DEFAULT_OUTPUT_DIR = path.resolve("resources/processed");

/**
 * Scan raw directory for unprocessed articles.
 */
function scanUnprocessed(rawDir: string, filterIds?: string[]): RawArticle[] {
  if (!fs.existsSync(rawDir)) {
    console.error(`Raw directory not found: ${rawDir}`);
    return [];
  }

  const entries = fs.readdirSync(rawDir, { withFileTypes: true });
  const articles: RawArticle[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Extract 6-digit ID from directory name
    const match = entry.name.match(/^(\d{6})-/);
    if (!match) continue;

    const id = match[1];

    // Filter by IDs if specified
    if (filterIds && filterIds.length > 0 && !filterIds.includes(id)) continue;

    const articlePath = path.join(rawDir, entry.name, "article.md");
    if (!fs.existsSync(articlePath)) continue;

    try {
      const raw = fs.readFileSync(articlePath, "utf-8");
      const { data: frontmatter, content } = matter(raw);

      // Skip if already processed
      if (frontmatter.processed_at) continue;

      articles.push({
        id,
        dirPath: path.join(rawDir, entry.name),
        frontmatter: frontmatter as RawArticleFrontmatter,
        content,
      });
    } catch (err) {
      console.warn(`  Warning: Failed to read ${articlePath}: ${err}`);
    }
  }

  // Sort by ID ascending
  articles.sort((a, b) => a.id.localeCompare(b.id));
  return articles;
}

/**
 * Mark original article as processed by adding processed_at to frontmatter.
 */
function markAsProcessed(dirPath: string): void {
  const articlePath = path.join(dirPath, "article.md");
  const raw = fs.readFileSync(articlePath, "utf-8");
  const { data, content } = matter(raw);
  data.processed_at = new Date().toISOString();
  const updated = matter.stringify(content, data);
  fs.writeFileSync(articlePath, updated, "utf-8");
}

/**
 * Process a single article through the full pipeline.
 */
async function processArticle(
  article: RawArticle,
  options: ProcessorOptions
): Promise<{ success: boolean; error?: string }> {
  console.log(`  [${article.id}] ${article.frontmatter.title || "untitled"}`);

  try {
    // Step 1: Extract + Score
    console.log("    Extracting...");
    const fullContent = article.content;
    let extraction = await extractArticle(fullContent);

    // Validate scores
    const scoreErrors = validateScore(extraction.score);
    if (scoreErrors.length > 0) {
      console.warn(`    Score validation warnings: ${scoreErrors.join("; ")}`);
    }

    // Step 2: Review (unless skipped)
    if (!options.skipReview && !options.extractOnly) {
      console.log("    Reviewing...");
      const reviewResult = await reviewExtraction(fullContent, extraction);
      extraction = reviewResult.extraction;

      if (reviewResult.reviewNotes.length > 0) {
        console.log(`    Review corrections: ${reviewResult.reviewNotes.length} item(s)`);
        for (const note of reviewResult.reviewNotes) {
          console.log(`      - ${note}`);
        }
      } else {
        console.log("    Review passed without corrections");
      }
    }

    // Step 3: Format and write output
    const outputMarkdown = formatProcessedMarkdown(article, extraction);

    if (!fs.existsSync(options.outputDir)) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }

    const outputPath = path.join(options.outputDir, `${article.id}.md`);
    fs.writeFileSync(outputPath, outputMarkdown, "utf-8");
    console.log(`    -> ${outputPath}`);

    // Step 4: Mark original as processed
    markAsProcessed(article.dirPath);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`    FAILED: ${message}`);
    return { success: false, error: message };
  }
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("article-processor")
    .description("Process raw articles with LLM extraction, scoring, and review")
    .option("--id <ids...>", "Process specific article IDs (e.g., --id 100001 100002)")
    .option("--raw-dir <dir>", "Raw articles directory", DEFAULT_RAW_DIR)
    .option("--output-dir <dir>", "Output directory", DEFAULT_OUTPUT_DIR)
    .option("--skip-review", "Skip the review step")
    .option("--extract-only", "Extract only, no scoring (debug mode)")
    .parse();

  const opts = program.opts();
  const options: ProcessorOptions = {
    ids: opts.id || [],
    rawDir: path.resolve(opts.rawDir),
    outputDir: path.resolve(opts.outputDir),
    skipReview: opts.skipReview || false,
    extractOnly: opts.extractOnly || false,
  };

  // Validate API key
  if (!process.env.MINIMAX_API_KEY) {
    console.error("Error: MINIMAX_API_KEY environment variable is required");
    console.error("Set it with: export MINIMAX_API_KEY=your-key-here");
    process.exit(1);
  }

  console.log(`Scanning: ${options.rawDir}`);
  const articles = scanUnprocessed(options.rawDir, options.ids);

  if (articles.length === 0) {
    console.log("No unprocessed articles found.");
    return;
  }

  console.log(`Found ${articles.length} article(s) to process\n`);

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    console.log(`[${i + 1}/${articles.length}]`);
    const result = await processArticle(articles[i], options);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
    console.log("");
  }

  console.log("=== Summary ===");
  console.log(`Success: ${succeeded}, Failed: ${failed}`);
  if (failed > 0) {
    console.log("Some articles failed. Re-run to retry failed articles.");
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
