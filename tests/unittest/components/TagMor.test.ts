import { describe, it, expect } from 'vitest'
import { getMorandiColor, distributeTagColors } from '@/components/helpers'
import { MORANDI_TAGS } from '@/utils/constants'

describe('TagMor logic', () => {
  describe('getMorandiColor', () => {
    it('maps each index 0-4 to the correct Morandi palette entry', () => {
      for (let i = 0; i < 5; i++) {
        const c = getMorandiColor(i)
        expect(c.bg).toBe(MORANDI_TAGS[i].bg)
        expect(c.text).toBe(MORANDI_TAGS[i].text)
      }
    })

    it('clamps negative index to first entry', () => {
      expect(getMorandiColor(-1)).toEqual(getMorandiColor(0))
    })

    it('clamps out-of-range index to last entry', () => {
      expect(getMorandiColor(10)).toEqual(getMorandiColor(4))
    })
  })

  describe('distributeTagColors', () => {
    it('returns correct indices for small count', () => {
      expect(distributeTagColors(2)).toEqual([0, 1])
    })

    it('wraps around when count > 5', () => {
      const result = distributeTagColors(7)
      expect(result).toEqual([0, 1, 2, 3, 4, 0, 1])
    })

    it('applies startOffset', () => {
      expect(distributeTagColors(3, 3)).toEqual([3, 4, 0])
    })

    it('returns empty array for count=0', () => {
      expect(distributeTagColors(0)).toEqual([])
    })
  })
})
