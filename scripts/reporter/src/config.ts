import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, "..")
const REPO_ROOT = path.resolve(PROJECT_ROOT, "..", "..")

// Manual .env parsing (dotenv is intercepted by external tool)
const envPath = path.resolve(REPO_ROOT, ".env")
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && val && !process.env[key]) {
      process.env[key] = val
    }
  }
}

export const config = {
  ENV_ID: validate("CLOUDBASE_ENV_ID"),
  SECRET_ID: validate("CLOUDBASE_SECRET_ID"),
  SECRET_KEY: validate("CLOUDBASE_SECRET_KEY"),
  OUTPUT_DIR: path.resolve(PROJECT_ROOT, "output"),
  FONTS_DIR: path.resolve(PROJECT_ROOT, "fonts"),
}

function validate(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`${key} is not set in environment`)
  return val
}

export function ensureOutputDir(): void {
  fs.mkdirSync(config.OUTPUT_DIR, { recursive: true })
}
