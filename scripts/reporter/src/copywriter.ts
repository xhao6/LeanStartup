#!/usr/bin/env node
import { generateXhsCopy } from "./lib/copywriter.js"
import { ensureOutputDir } from "./config.js"

async function main() {
  ensureOutputDir()

  const args = process.argv.slice(2)
  const command = args[0]

  if (command !== "daily" || args.includes("--help")) {
    console.log(`Usage: npx tsx src/copywriter.ts daily [date]

Examples:
  npx tsx src/copywriter.ts daily
  npx tsx src/copywriter.ts daily 2026-06-01
`)
    process.exit(command === "--help" ? 0 : 1)
  }

  const date = args[1] || new Date().toISOString().slice(0, 10)
  console.log(`Generating XHS copy for ${date}...`)

  const path = await generateXhsCopy(date)
  console.log(`  xhs-copy: ${path}`)
}

main().catch((err) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
