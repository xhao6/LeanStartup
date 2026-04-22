/**
 * 准备22篇案例数据
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const processedDir = path.join(__dirname, 'resources/processed')
const outputFile = path.join(__dirname, 'cases-batch.json')

/**
 * 解析某个 section 的内容
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
    .map(line => line.replace(/^[-\d]+\.?\s*/, '').trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/^(.+?):\s*(.+)$/)
      if (match) {
        return { [match[1].trim()]: match[2].trim() || '' }
      }
      return line
    })
}

/**
 * 解析 MD 文件，提取案例数据
 */
function parseCaseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const { data } = matter(content)

  const cycle = extractSection(content, '变现周期')
  const revenue = extractSection(content, '预期收益')
  const cost = extractSection(content, '启动成本')
  const pitfalls = extractSection(content, '避坑指南')
  const suitableFor = extractSection(content, '适合人群')
  const riskTags = extractSection(content, '风险标签')
  const tags = extractSection(content, '吸睛标签')

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
    cost: cost || '',
    expected_revenue: revenue || '',
    cycle: cycle || '',
    steps: parseList(extractSection(content, '操作步骤')),
    tools: parseList(extractSection(content, '所需工具')),
    pitfalls: pitfalls || '',
    suitable_for: suitableFor || '',
    risk_tags: parseList(riskTags),
    tags: parseList(tags),
    case_story: extractSection(content, '案例故事') || '',
    status: 'published'
  }
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
 * 主函数
 */
async function main() {
  console.log('准备案例数据...')

  const cases = loadAllCases()
  console.log(`找到 ${cases.length} 个案例`)

  // 验证所有必填字段
  const required = ['id', 'title', 'source_account', 'source_url', 'summary',
    'score_total', 'score_feasibility', 'score_profit', 'score_timeliness',
    'score_detail', 'score_fitness', 'cost', 'expected_revenue', 'cycle',
    'steps', 'tools', 'pitfalls', 'suitable_for', 'risk_tags', 'status']

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]
    const missing = required.filter(f => c[f] === undefined || c[f] === null || c[f] === '')
    if (missing.length > 0) {
      console.error(`案例 ${c.id} 缺少字段: ${missing.join(', ')}`)
    }
  }

  // 写入 JSON 文件
  fs.writeFileSync(outputFile, JSON.stringify({ cases }, null, 2))
  console.log(`已写入: ${outputFile}`)
  console.log('\n现在可以使用以下方式同步:')
  console.log('1. 使用 callFunction 调用 syncCaseData 云函数')
  console.log('2. 或使用 MCP writeNoSqlDatabaseContent 工具')
}

main()
