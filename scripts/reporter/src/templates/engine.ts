export function renderTemplate(
  template: string,
  data: Record<string, any>
): string {
  let result = ""
  let i = 0

  while (i < template.length) {
    const eachMatch = /^\{\{#each\s+(\w+)\}\}/.exec(template.slice(i))
    if (eachMatch) {
      const key = eachMatch[1]
      const openEnd = i + eachMatch[0].length
      const closeIdx = findMatchingClose(template, "each", openEnd)
      if (closeIdx === -1) {
        result += template[i++]
        continue
      }

      const inner = template.slice(openEnd, closeIdx)
      const items = data[key]
      if (Array.isArray(items)) {
        for (const item of items) {
          const itemData = typeof item === "object" && item !== null ? item : { this: item }
          result += renderTemplate(inner, itemData)
        }
      }
      i = closeIdx + "{{/each}}".length
      continue
    }

    const ifMatch = /^\{\{#if\s+(\w+)\}\}/.exec(template.slice(i))
    if (ifMatch) {
      const key = ifMatch[1]
      const openEnd = i + ifMatch[0].length
      const closeIdx = findMatchingClose(template, "if", openEnd)
      if (closeIdx === -1) {
        result += template[i++]
        continue
      }

      const inner = template.slice(openEnd, closeIdx)
      const val = data[key]
      const elseIdx = findElse(inner, 0)
      if (elseIdx !== -1) {
        const thenBlock = inner.slice(0, elseIdx)
        const elseBlock = inner.slice(elseIdx + "{{else}}".length)
        if (val && !(Array.isArray(val) && val.length === 0)) {
          result += renderTemplate(thenBlock, data)
        } else {
          result += renderTemplate(elseBlock, data)
        }
      } else {
        if (val && !(Array.isArray(val) && val.length === 0)) {
          result += renderTemplate(inner, data)
        }
      }
      i = closeIdx + "{{/if}}".length
      continue
    }

    const wordMatch = /^\{\{(\w+)\}\}/.exec(template.slice(i))
    if (wordMatch) {
      const key = wordMatch[1]
      const val = data[key]
      if (val === undefined || val === null) {
        result += `{{${key}}}`
      } else {
        result += escapeHtml(String(val))
      }
      i += wordMatch[0].length
      continue
    }

    result += template[i++]
  }

  return result
}

function findElse(template: string, start: number): number {
  let depth = 0
  let i = start
  const blockOpen = /\{\{#(?:if|each)\s+\w+\}\}/
  const blockClose = /\{\{\/(?:if|each)\}\}/
  const elseStr = "{{else}}"

  while (i < template.length) {
    const nextBlockOpen = template.slice(i).search(blockOpen)
    const nextBlockClose = template.slice(i).search(blockClose)
    const nextElse = template.indexOf(elseStr, i)

    if (nextElse === -1) return -1

    const absBlockOpen = nextBlockOpen !== -1 ? i + nextBlockOpen : -1
    const absBlockClose = nextBlockClose !== -1 ? i + nextBlockClose : -1

    let minPos = nextElse
    if (absBlockOpen !== -1 && absBlockOpen < minPos) minPos = absBlockOpen
    if (absBlockClose !== -1 && absBlockClose < minPos) minPos = absBlockClose

    if (minPos === absBlockOpen) {
      depth++
      const match = blockOpen.exec(template.slice(absBlockOpen))
      i = absBlockOpen + match![0].length
    } else if (minPos === absBlockClose) {
      depth--
      const match = blockClose.exec(template.slice(absBlockClose))
      i = absBlockClose + match![0].length
    } else {
      if (depth === 0) return nextElse
      i = nextElse + elseStr.length
    }
  }

  return -1
}

function findMatchingClose(
  template: string,
  blockType: string,
  start: number
): number {
  let depth = 1
  let i = start
  const openStr = `{{#${blockType}`
  const closeStr = `{{/${blockType}}}`

  while (depth > 0 && i < template.length) {
    const nextOpen = template.indexOf(openStr, i)
    const nextClose = template.indexOf(closeStr, i)

    if (nextClose === -1) return -1

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + openStr.length
    } else {
      depth--
      i = nextClose + closeStr.length
      if (depth === 0) return nextClose
    }
  }

  return -1
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
