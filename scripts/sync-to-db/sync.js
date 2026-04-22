/**
 * 同步案例数据到 CloudBase NoSQL 数据库
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { loadCasesFromDir, validateCases } = require('./lib/parser')
const { initCloudBase, syncCasesToCloud } = require('./lib/sync')

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2)

  // 默认配置
  const defaults = {
    inputDir: path.join(__dirname, '../../resources/processed'),
    inputFile: null,
    functionName: 'syncCaseDataPublic',
    envId: process.env.CLOUDBASE_ENV_ID,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY
  }

  // 解析命令行参数
  const config = { ...defaults }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      config.inputDir = args[i + 1]
      i++
    } else if (args[i] === '--file' && args[i + 1]) {
      config.inputFile = args[i + 1]
      i++
    } else if (args[i] === '--function' && args[i + 1]) {
      config.functionName = args[i + 1]
      i++
    } else if (args[i] === '--env' && args[i + 1]) {
      config.envId = args[i + 1]
      i++
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
同步案例数据到 CloudBase NoSQL 数据库

用法:
  node sync.js [选项]

选项:
  --input <dir>      输入目录，直接解析 MD 文件 (默认: ../../resources/processed)
  --file <path>      输入 JSON 文件，使用 prepare.js 生成的文件
  --function <name>  云函数名称 (默认: syncCaseDataPublic)
  --env <id>         CloudBase 环境 ID (默认: CLOUDBASE_ENV_ID 环境变量)
  -h, --help         显示帮助信息

示例:
  # 直接解析 MD 文件并同步
  node sync.js

  # 从 JSON 文件同步
  node sync.js --file cases-batch.json

  # 指定输入目录
  node sync.js --input ./data

  # 指定云函数
  node sync.js --function myCustomSyncFunction
      `)
      process.exit(0)
    }
  }

  // 环境变量检查
  if (!config.envId || !config.secretId || !config.secretKey) {
    console.error('错误: 缺少环境变量配置')
    console.error('请确保 .env 文件包含:')
    console.error('  CLOUDBASE_ENV_ID')
    console.error('  CLOUDBASE_SECRET_ID')
    console.error('  CLOUDBASE_SECRET_KEY')
    process.exit(1)
  }

  // 加载数据
  let cases
  if (config.inputFile) {
    console.log(`从文件加载: ${config.inputFile}`)
    const content = fs.readFileSync(config.inputFile, 'utf8')
    const data = JSON.parse(content)
    cases = data.cases
  } else {
    console.log(`从目录加载: ${config.inputDir}`)
    cases = loadCasesFromDir(config.inputDir)
  }

  console.log(`找到 ${cases.length} 个案例`)

  // 验证数据
  const validation = validateCases(cases)
  if (!validation.valid) {
    console.error('\n数据验证失败:')
    validation.errors.forEach(err => console.error(`  ❌ ${err}`))
    process.exit(1)
  }
  console.log('✅ 数据验证通过')

  // 初始化 CloudBase
  console.log(`\n连接到 CloudBase 环境: ${config.envId}`)
  const app = initCloudBase(config.envId, config.secretId, config.secretKey)

  // 同步数据
  console.log(`调用云函数: ${config.functionName}`)
  try {
    const result = await syncCasesToCloud(app, config.functionName, cases)

    if (result && result.success) {
      console.log(`\n✅ 同步成功!`)
      console.log(`   同步数量: ${result.data?.synced || 0}`)
      console.log(`   新增: ${result.data?.created || 0}`)
      console.log(`   更新: ${result.data?.updated || 0}`)
      if (result.data?.errors?.length > 0) {
        console.log(`\n⚠️  部分数据同步失败:`)
        result.data.errors.forEach(err => console.log(`   ${err}`))
      }
    } else {
      console.error('\n❌ 同步失败:', result)
      process.exit(1)
    }
  } catch (err) {
    console.error('\n❌ 同步失败:', err.message)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('错误:', err.message)
  process.exit(1)
})
