/**
 * Sync-to-DB - 数据同步工具
 * 统一入口，支持 prepare 和 sync 子命令
 */
require('dotenv').config()

const command = process.argv[2] || ''
const args = process.argv.slice(3)

// 显示帮助
function showHelp() {
  console.log(`
Sync-to-DB - 数据同步工具

用法:
  node index.js <command> [options]

命令:
  prepare    准备数据 - 从 MD 文件解析并输出到 JSON
  sync       同步数据 - 将案例数据同步到 CloudBase NoSQL
  help       显示帮助信息

选项:
  详见各子命令的帮助: node index.js <command> --help

示例:
  # 准备数据
  node index.js prepare --input ./data --output ./cases.json

  # 同步数据（直接解析 MD）
  node index.js sync

  # 同步数据（从 JSON 文件）
  node index.js sync --file cases.json

环境变量:
  CLOUDBASE_ENV_ID       CloudBase 环境 ID
  CLOUDBASE_SECRET_ID   腾讯云 SecretId
  CLOUDBASE_SECRET_KEY   腾讯云 SecretKey
  `)
}

// 路由到子命令
switch (command) {
  case 'prepare':
    require('./prepare.js')
    break
  case 'sync':
    require('./sync.js')
    break
  case 'help':
  case '-h':
  case '--help':
    showHelp()
    break
  default:
    if (command) {
      console.error(`未知命令: ${command}`)
      console.error('运行 "node index.js help" 查看可用命令\n')
    }
    showHelp()
    process.exit(1)
}
