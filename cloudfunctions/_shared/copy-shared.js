// cloudfunctions/_shared/copy-shared.js
// 将共享模块复制到各云函数的 utils/ 目录
// 带 hash drift 检测：对比文件内容，不一致时覆盖并报告
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// 需要复制共享模块的云函数列表
const FUNCTIONS = [
  'getDailyPick',
  'getCaseDetail',
  'getUserCollections',
  'toggleCollection',
  'trackEvent',
  'subscribeMessage',
  'generateDailyPick',
  'syncCaseData'
]

// 每个函数需要的共享模块
const MODULES = {
  default: ['db.js', 'auth.js', 'response.js', 'date.js'],
  subscribeMessage: ['db.js', 'auth.js', 'response.js', 'date.js', 'wechat-api.js'],
  generateDailyPick: ['db.js', 'auth.js', 'response.js', 'date.js', 'wechat-api.js'],
  syncCaseData: ['db.js', 'auth.js', 'response.js', 'date.js']
}

function fileHash(filepath) {
  if (!fs.existsSync(filepath)) return null
  const content = fs.readFileSync(filepath)
  return crypto.createHash('md5').update(content).digest('hex')
}

const sharedDir = path.join(__dirname)
let copied = 0
let skipped = 0
let drifted = 0

for (const fn of FUNCTIONS) {
  const utilsDir = path.join(__dirname, '..', fn, 'utils')
  const modules = MODULES[fn] || MODULES.default

  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true })
  }

  for (const mod of modules) {
    const src = path.join(sharedDir, mod)
    const dest = path.join(utilsDir, mod)

    if (!fs.existsSync(src)) {
      console.warn(`  SKIP ${mod} not found in _shared/`)
      continue
    }

    const srcHash = fileHash(src)
    const destHash = fileHash(dest)

    if (destHash === null) {
      fs.copyFileSync(src, dest)
      console.log(`  NEW  ${mod} → ${fn}/utils/`)
      copied++
    } else if (srcHash !== destHash) {
      fs.copyFileSync(src, dest)
      console.log(`  DRIFT ${mod} → ${fn}/utils/ (hash mismatch, updated)`)
      drifted++
    } else {
      skipped++
    }
  }
}

console.log(`\nDone. Copied: ${copied}, Drift-fixed: ${drifted}, Unchanged: ${skipped}`)

if (drifted > 0) {
  console.log('⚠️  Drift detected! Shared modules were out of sync.')
  process.exitCode = 1
}
