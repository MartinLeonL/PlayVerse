import { formatScore } from './format'

describe('formatScore', () => {
  it('drops the decimal for a perfect 10', () => {
    expect(formatScore(10)).toBe('10')
  })

  it('keeps one decimal place for every other score', () => {
    expect(formatScore(8.7)).toBe('8.7')
    expect(formatScore(7)).toBe('7.0')
    expect(formatScore(0)).toBe('0.0')
  })
})