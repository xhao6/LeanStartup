import { describe, it, expect } from 'vitest'

// 注意：这些函数与 src/composables/usePosterCanvas.ts 中的实现保持同步。
// 由于 composable 被 #ifdef MP-WEIXIN 包裹且依赖 wx.* API，无法直接 import。
// 如果修改了源实现，请同步更新此处的测试副本。

describe('文字截断', () => {
  function truncateText(ctx: { measureText(t: string): { width: number } }, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text
    let truncated = text
    while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '…'
  }

  function mockCtx() {
    return { measureText: (t: string) => ({ width: t.length * 10 }) }
  }

  it('不截断短文本', () => {
    const ctx = mockCtx()
    expect(truncateText(ctx, 'hello', 100)).toBe('hello')
  })

  it('截断超长文本', () => {
    const ctx = mockCtx()
    const result = truncateText(ctx, '这是一个非常长的文本内容', 80)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThan('这是一个非常长的文本内容'.length)
  })

  it('正好等于边界时不截断', () => {
    const ctx = mockCtx()
    expect(truncateText(ctx, 'abcde', 50)).toBe('abcde')
  })
})

describe('数据转换', () => {
  function toRenderCase(c: any) {
    return {
      id: c.id || '',
      title: c.title || '',
      summary: c.summary || '',
      score_total: c.score_total || 0,
      cost: c.cost || '',
      source_account: c.source_account || '',
      tags: c.tags || [],
      suitable_for: c.suitable_for || '',
      cycle: c.cycle || '',
      source_url: c.source_url || '',
      story: c.story || '',
      score_feasibility: c.score_feasibility || 0,
      score_profit: c.score_profit || 0,
      score_timeliness: c.score_timeliness || 0,
      score_detail: c.score_detail || 0,
      score_fitness: c.score_fitness || 0,
      expected_revenue: c.expected_revenue || '',
      steps: (c.steps || []).map((s: any) => (typeof s === 'string' ? s : s.step || '')),
      tools: c.tools || [],
      pitfalls: c.pitfalls || '',
      risk_tags: c.risk_tags || [],
      image: c.image || '',
    }
  }

  it('转换标准输入', () => {
    const input = {
      id: '123', title: '测试案例', summary: '摘要描述',
      score_total: 8.5, tags: ['tag1'],
    }
    const result = toRenderCase(input)
    expect(result.id).toBe('123')
    expect(result.title).toBe('测试案例')
    expect(result.score_total).toBe(8.5)
    expect(result.tags).toEqual(['tag1'])
    expect(result.story).toBe('')
  })

  it('解析 steps 为字符串数组', () => {
    const input = { id: '1', steps: [{ step: '第一步' }, { step: '第二步' }, '直接字符串'] }
    const result = toRenderCase(input)
    expect(result.steps).toEqual(['第一步', '第二步', '直接字符串'])
  })

  it('处理空输入', () => {
    const result = toRenderCase({})
    expect(result.id).toBe('')
    expect(result.steps).toEqual([])
    expect(result.score_total).toBe(0)
  })
})

describe('文字折行', () => {
  function splitText(ctx: { measureText(t: string): { width: number } }, text: string, maxWidth: number, maxLines?: number): string[] {
    const lines: string[] = []
    let current = ''
    for (const char of text) {
      if (ctx.measureText(current + char).width > maxWidth) {
        if (current) lines.push(current)
        current = char
      } else {
        current += char
      }
      if (maxLines && lines.length >= maxLines) {
        if (current) lines[lines.length - 1] = truncateTextFixed(ctx, lines[lines.length - 1], maxWidth)
        return lines
      }
    }
    if (current) lines.push(current)
    return lines
  }

  function truncateTextFixed(ctx: { measureText(t: string): { width: number } }, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text
    let truncated = text
    while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '…'
  }

  function mockCtx() {
    return { measureText: (t: string) => ({ width: t.length * 10 }) }
  }

  it('折行短文本', () => {
    const ctx = mockCtx()
    expect(splitText(ctx, 'hello', 100)).toEqual(['hello'])
  })

  it('折行长文本', () => {
    const ctx = mockCtx()
    const result = splitText(ctx, '12345678901234567890', 50)
    expect(result.length).toBeGreaterThan(1)
    expect(result.join('').replace('…', '').length).toBeGreaterThan(0)
  })

  it('限制行数', () => {
    const ctx = mockCtx()
    const result = splitText(ctx, '12345678901234567890', 50, 2)
    expect(result.length).toBe(2)
  })
})
