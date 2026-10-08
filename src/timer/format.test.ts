import { expect, it } from 'vitest'
import { formatTime } from './format'

it('formats milliseconds as MM:SS, rounding partial seconds up', () => {
  expect(formatTime(25 * 60_000)).toBe('25:00')
  expect(formatTime(59_001)).toBe('01:00')
  expect(formatTime(0)).toBe('00:00')
  expect(formatTime(-5)).toBe('00:00')
})
