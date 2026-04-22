// scripts/sync-to-db/src/index.ts
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import { parseProcessedMd, scanProcessedDir } from "./parser.js";
import type { CaseRecord, SyncOptions } from "./types.js";

const DEFAULT_PROCESSED_DIR = path.resolve("resources/processed");

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("sync-to-db")
    .description("Sync processed articles to NoSQL Case collection via syncCaseData cloud function")
    .option("--id <ids...>", "Sync specific article IDs (e.g., --id 100001 100002)")
    .option("--processed-dir <dir>", "Processed articles directory", DEFAULT_PROCESSED_DIR)
    .option("--dry-run", "Output JSON only, do not write to database")
    .parse();

  const opts = program.opts();
  const options: SyncOptions = {
    ids: opts.id || [],
    processedDir: path.resolve(opts.processedDir),
    dryRun: opts.dryRun || false,
  };

  console.log(`Scanning: ${options.processedDir}`);
  const files = scanProcessedDir(options.processedDir, options.ids);

  if (files.length === 0) {
    console.log("No processed articles found.");
    return;
  }

  console.log(`Found ${files.length} article(s) to sync\n`);

  // Parse all articles
  const records: CaseRecord[] = [];
  const parseErrors: { id: string; error: string }[] = [];

  for (const { id, filePath } of files) {
    try {
      const record = parseProcessedMd(filePath);
      records.push(record);
      const title = record.title || "(untitled)";
      console.log(`  [${id}] ${title.slice(0, 40)} (score=${record.score_total})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      parseErrors.push({ id, error: msg });
      console.error(`  [${id}] PARSE ERROR: ${msg}`);
    }
  }

  if (parseErrors.length > 0) {
    console.log(`\nParse errors: ${parseErrors.length}`);
  }

  // Dry run mode
  if (options.dryRun) {
    console.log("\n=== DRY RUN ===");
    console.log(JSON.stringify(records, null, 2));
    console.log(`\nTotal: ${records.length} records ready to sync`);
    return;
  }

  // Sync via syncCaseData cloud function (batch by 10)
  console.log(`\nSyncing ${records.length} records to database...`);
  console.log("NOTE: Use MCP manageFunctions(invokeFunction) to call syncCaseData with the JSON.\n");

  const BATCH_SIZE = 10;
  let synced = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`Batch ${batchNum}: ${batch.length} records (records ${i + 1}-${i + batch.length})`);
    synced += batch.length;
  }

  if (parseErrors.length > 0) {
    console.log("\nParse errors:");
    for (const e of parseErrors) {
      console.log(`  [${e.id}] ${e.error}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Parsed: ${records.length}, Errors: ${parseErrors.length}`);
  console.log("\nTo sync to database, use CloudBase MCP manageFunctions(invokeFunction, syncCaseData, {cases: [...]})");
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});