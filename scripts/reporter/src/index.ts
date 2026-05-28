#!/usr/bin/env node
import { generateDailyReport, generateCaseDetailReport } from "./lib/report.js"
import { ensureOutputDir } from "./config.js"

const VALID_COMMANDS = ["daily", "single", "recent", "all"]

function showHelp(): void {
  console.log(`Usage: npx tsx src/index.ts <command> [options]

Commands:
  daily [date]           Generate today's Top3 and all images
  single --id <caseId>   Generate case detail image only
  recent                 Generate last 3 days rankings image
  all                    Generate all three images

Options:
  --id <caseId>          Case ID for single command
  --help                 Show this help

Examples:
  npx tsx src/index.ts daily
  npx tsx src/index.ts daily 2026-05-25
  npx tsx src/index.ts single --id 100001
  npx tsx src/index.ts all
`)
}

async function main() {
  ensureOutputDir()

  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === "--help" || !VALID_COMMANDS.includes(command)) {
    showHelp()
    process.exit(command === "--help" ? 0 : 1)
  }

  const caseIdIndex = args.indexOf("--id")
  const caseId = caseIdIndex !== -1 ? args[caseIdIndex + 1] : null

  try {
    switch (command) {
      case "daily": {
        const date = caseId || new Date().toISOString().slice(0, 10)
        console.log(`Generating daily report for ${date}...`)
        const results = await generateDailyReport(date)
        console.log(`  top3:        ${results.top3?.path ?? "skipped"}`)
        console.log(`  case-detail: ${results.caseDetail?.path ?? "skipped"}`)
        console.log(`  last3days:   ${results.last3Days?.path ?? "skipped"}`)
        break
      }
      case "single": {
        if (!caseId) {
          console.error("Error: --id is required")
          process.exit(1)
        }
        console.log(`Generating case detail for ${caseId}...`)
        const result = await generateCaseDetailReport(caseId)
        console.log(`  case-detail: ${result.path}`)
        break
      }
      case "recent": {
        const today = new Date().toISOString().slice(0, 10)
        console.log(`Generating last 3 days report...`)
        const results = await generateDailyReport(today)
        console.log(`  last3days: ${results.last3Days?.path ?? "skipped"}`)
        break
      }
      case "all": {
        const today = new Date().toISOString().slice(0, 10)
        console.log(`Generating all reports for ${today}...`)
        const results = await generateDailyReport(today)
        console.log(`  top3:        ${results.top3?.path ?? "skipped"}`)
        console.log(`  case-detail: ${results.caseDetail?.path ?? "skipped"}`)
        console.log(`  last3days:   ${results.last3Days?.path ?? "skipped"}`)
        break
      }
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`)
    process.exit(1)
  }

  // Give Puppeteer time to clean up
  setTimeout(() => process.exit(0), 500)
}

main()
