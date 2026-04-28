/**
 * MD 文件解析器
 * 解析 Markdown frontmatter 和 sections
 */
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

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
    status: 'published',
    processed_at: data.processed_at || null
  }
}

/**
 * 读取指定目录下的所有案例
 * @param {string} dirPath - 处理后的文章目录
 * @returns {Array} 案例数据数组
 */
function loadCasesFromDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const cases = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const mdFile = path.join(dirPath, entry.name, `${entry.name}.md`)
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
 * 验证案例数据完整性
 * @param {Array} cases - 案例数据数组
 * @returns {Object} 验证结果 { valid: boolean, errors: Array }
 */
function validateCases(cases) {
  const required = ['id', 'title', 'source_account', 'source_url', 'summary',
    'score_total', 'score_feasibility', 'score_profit', 'score_timeliness',
    'score_detail', 'score_fitness', 'cost', 'expected_revenue', 'cycle',
    'steps', 'tools', 'pitfalls', 'suitable_for', 'risk_tags', 'status']

  const errors = []

  for (const c of cases) {
    const missing = required.filter(f => c[f] === undefined || c[f] === null || c[f] === '')
    if (missing.length > 0) {
      errors.push(`案例 ${c.id} 缺少字段: ${missing.join(', ')}`)
    }

    // 验证评分一致性
    const sum = (c.score_feasibility || 0) + (c.score_profit || 0) +
                (c.score_timeliness || 0) + (c.score_detail || 0) +
                (c.score_fitness || 0)
    if (c.score_total !== sum) {
      errors.push(`案例 ${c.id} 评分不一致: score_total=${c.score_total}, 五维度之和=${sum}`)
    }

    // 验证评分为整数
    for (const key of ['score_total', 'score_feasibility', 'score_profit', 'score_timeliness', 'score_detail', 'score_fitness']) {
      if (c[key] !== undefined && !Number.isInteger(c[key])) {
        errors.push(`案例 ${c.id} ${key} 必须为整数，当前值: ${c[key]}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

module.exports = {
  extractSection,
  parseList,
  parseCaseFile,
  loadCasesFromDir,
  validateCases
}
