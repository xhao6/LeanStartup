/**
 * 准备案例数据
 * 从 MD 文件解析并输出到 JSON 文件
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { loadCasesFromDir, validateCases } = require('./lib/parser')

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)

  // 默认配置
  const defaults = {
    inputDir: path.join(__dirname, '../../resources/processed'),
    outputFile: path.join(__dirname, '../../cases-batch.json')
  }

  // 解析命令行参数
  const config = { ...defaults }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      config.inputDir = args[i + 1]
      i++
    } else if (args[i] === '--output' && args[i + 1]) {
      config.outputFile = args[i + 1]
      i++
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
准备案例数据 - 从 MD 文件解析并输出到 JSON

用法:
  node prepare.js [选项]

选项:
  --input <dir>      输入目录 (默认: ../../resources/processed)
  --output <file>    输出文件 (默认: ../../cases-batch.json)
  -h, --help         显示帮助信息

示例:
  node prepare.js
  node prepare.js --input ./data --output ./cases.json
      `)
      process.exit(0)
    }
  }

  console.log('准备案例数据...')
  console.log(`输入目录: ${config.inputDir}`)
  console.log(`输出文件: ${config.outputFile}`)

  // 加载案例
  const cases = loadCasesFromDir(config.inputDir)
  console.log(`找到 ${cases.length} 个案例`)

  // 验证数据
  const validation = validateCases(cases)
  if (!validation.valid) {
    console.error('\n数据验证失败:')
    validation.errors.forEach(err => console.error(`  ❌ ${err}`))
    process.exit(1)
  }
  console.log('✅ 数据验证通过')

  // 写入 JSON 文件
  fs.writeFileSync(config.outputFile, JSON.stringify({ cases }, null, 2))
  console.log(`\n已写入: ${config.outputFile}`)
  console.log('\n现在可以使用以下方式同步:')
  console.log('1. node sync.js --file ' + path.basename(config.outputFile))
  console.log('2. 或使用 MCP writeNoSqlDatabaseContent 工具')
}

main().catch(err => {
  console.error('错误:', err.message)
  process.exit(1)
})
