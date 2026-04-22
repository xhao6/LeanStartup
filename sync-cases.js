/**
 * 同步22篇案例到 Case 集合
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const cloudbase = require('@cloudbase/node-sdk')

const envId = process.env.CLOUDBASE_ENV_ID
const processedDir = path.join(__dirname, 'resources/processed')

// 初始化 CloudBase
const app = cloudbase.init({
  envId,
  secretId: process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY
})

/**
 * 解析 MD 文件，提取案例数据
 */
function parseCaseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const { data } = matter(content)

  return {
    id: data.id,
    title: data.source_title || '',
    source_account: data.source_author || '',
    source_url: data.source_url || '',
    summary: extractSection(content, '核心亮点') || extractSection(content, '案例故事').substring(0, 200) + '...',
    score_total: data.total_score || 0,
    score_feasibility: data.scores?.feasibility || 0,
    score_profit: data.scores?.revenue || 0,
    score_timeliness: data.scores?.timeliness || 0,
    score_detail: data.scores?.detail || 0,
    score_fitness: data.scores?.userFit || 0,
    cost: extractSection(content, '启动成本'),
    expected_revenue: extractSection(content, '预期收益'),
    cycle: extractSection(content, '变现周期'),
    steps: parseList(extractSection(content, '操作步骤')),
    tools: parseList(extractSection(content, '所需工具')),
    pitfalls: extractSection(content, '避坑指南'),
    suitable_for: extractSection(content, '适合人群'),
    risk_tags: parseList(extractSection(content, '风险标签')),
    tags: parseList(extractSection(content, '吸睛标签')),
    case_story: extractSection(content, '案例故事') || '',
    status: 'published'
  }
}

/**
 * 提取某个 section 的内容
 */
function extractSection(content, sectionName) {
  const regex = new RegExp(`## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |\\n$|$)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

/**
 * 解析列表（用于 steps/tools/tags 等）
 */
function parseList(text) {
  if (!text) return []
  return text.split('\n')
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/^(.+?):\s*(.+)$/)
      if (match) {
        return { [match[1]]: match[2] || '' }
      }
      return line
    })
}

/**
 * 读取所有处理过的案例
 */
function loadAllCases() {
  const entries = fs.readdirSync(processedDir, { withFileTypes: true })
  const cases = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const mdFile = path.join(processedDir, entry.name, `${entry.name}.md`)
      if (fs.existsSync(mdFile)) {
        try {
          const caseData = parseCaseFile(mdFile)
          cases.push(caseData)
        } catch (e) {
          console.error(`解析文件失败: ${mdFile}`, e.message)
        }
      }
    }
  }

  return cases
}

/**
 * 主函数：同步案例
 */
async function syncCases() {
  console.log('开始同步案例...')

  const cases = loadAllCases()
  console.log(`找到 ${cases.length} 个案例`)

  try {
    const result = await app.callFunction({
      name: 'syncCaseDataPublic',
      data: { cases }
    })

    console.log('同步结果:', result.result)

    if (result.result && result.result.success) {
      console.log(`✅ 成功同步 ${result.result.data.synced} 条案例`)
    } else {
      console.error('❌ 同步失败:', result.result)
    }
  } catch (err) {
    console.error('调用云函数失败:', err)
  }
}

syncCases()
