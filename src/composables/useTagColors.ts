// src/composables/useTagColors.ts
const TAG_COLORS = [
  'tag-pink', 'tag-yellow', 'tag-blue', 'tag-green', 'tag-purple',
  'tag-mint', 'tag-peach', 'tag-lavender', 'tag-coral', 'tag-lemon',
  'tag-sky', 'tag-rose', 'tag-olive', 'tag-wine'
]

const hashCode = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export const getTagClass = (tag: string): string => {
  const index = hashCode(tag) % TAG_COLORS.length
  return TAG_COLORS[index]
}
