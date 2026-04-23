/**
 * 数据库内容正确性测试
 * 验证 Case 集合中的评分一致性
 */
const fs = require('fs')
const path = require('path')

// 数据库导出文件（由 MCP 工具生成）
const DB_EXPORT_FILE = path.join(__dirname, '../.tmp/db-export.json')

describe('Case Collection Data Validation', () => {
  let records = []

  beforeAll(() => {
    // 读取数据库导出文件
    const content = fs.readFileSync(DB_EXPORT_FILE, 'utf8')
    const wrapper = JSON.parse(content)
    records = wrapper[0]?.text ? JSON.parse(wrapper[0].text) : wrapper
    records = records.data || []
  })

  test('数据库记录数量正确', () => {
    expect(records.length).toBeGreaterThan(0)
    console.log(`总计 ${records.length} 条记录`)
  })

  test('每条记录的评分一致性', () => {
    const errors = []

    records.forEach((item, i) => {
      const scoreSum =
        (item.score_feasibility || 0) +
        (item.score_profit || 0) +
        (item.score_timeliness || 0) +
        (item.score_detail || 0) +
        (item.score_fitness || 0)

      if (item.score_total !== scoreSum) {
        errors.push({
          id: item.id,
          expected: scoreSum,
          actual: item.score_total
        })
      }
    })

    if (errors.length > 0) {
      console.error('\n评分不一致的记录:')
      errors.forEach(e => {
        console.error(`  ID ${e.id}: score_total=${e.actual} 但五维度之和=${e.expected}`)
      })
    }

    expect(errors).toHaveLength(0)
  })

  test('所有评分必须为整数', () => {
    const scoreFields = ['score_total', 'score_feasibility', 'score_profit', 'score_timeliness', 'score_detail', 'score_fitness']
    const errors = []

    records.forEach(item => {
      scoreFields.forEach(field => {
        if (item[field] !== undefined && !Number.isInteger(item[field])) {
          errors.push({
            id: item.id,
            field,
            value: item[field]
          })
        }
      })
    })

    if (errors.length > 0) {
      console.error('\n非整数评分:')
      errors.forEach(e => {
        console.error(`  ID ${e.id}: ${e.field}=${e.value} (非整数)`)
      })
    }

    expect(errors).toHaveLength(0)
  })

  test('必填字段完整性', () => {
    const required = ['id', 'title', 'source_account', 'source_url', 'summary',
      'score_total', 'cost', 'expected_revenue', 'cycle', 'status']
    const errors = []

    records.forEach(item => {
      required.forEach(field => {
        if (item[field] === undefined || item[field] === null || item[field] === '') {
          errors.push({ id: item.id, field })
        }
      })
    })

    if (errors.length > 0) {
      console.error('\n缺少必填字段的记录:')
      errors.forEach(e => {
        console.error(`  ID ${e.id}: 缺少 ${e.field}`)
      })
    }

    expect(errors).toHaveLength(0)
  })

  test('所有记录状态为 published', () => {
    const invalid = records.filter(item => item.status !== 'published')
    if (invalid.length > 0) {
      console.error(`\n非 published 状态的记录: ${invalid.length} 条`)
      invalid.forEach(item => {
        console.error(`  ID ${item.id}: status=${item.status}`)
      })
    }
    expect(invalid).toHaveLength(0)
  })

  test('ID 格式正确 (100001-100022)', () => {
    const validIds = Array.from({ length: 22 }, (_, i) => String(100001 + i).padStart(6, '0'))
    const errors = []

    records.forEach(item => {
      // 排除测试记录
      if (item.id === 'test-sdk-verify') return

      if (!validIds.includes(item.id)) {
        errors.push({ id: item.id, reason: '不在 100001-100022 范围内' })
      }
    })

    if (errors.length > 0) {
      console.error('\nID 格式错误的记录:')
      errors.forEach(e => console.error(`  ID ${e.id}: ${e.reason}`))
    }

    expect(errors).toHaveLength(0)
  })
})