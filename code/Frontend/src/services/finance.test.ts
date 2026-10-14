import assert from 'node:assert/strict'
import test from 'node:test'
import { decimalCents, formatBaht } from './finance'

test('decimal strings convert exactly to cents, including values beyond safe integer precision', () => {
  assert.equal(decimalCents('0.01'), 1n)
  assert.equal(decimalCents('999999999999999.99'), 99999999999999999n)
  assert.equal(decimalCents('1.001'), null)
  assert.equal(decimalCents('-0.01'), -1n)
})

test('THB formatting keeps two digits without floating point rounding', () => {
  assert.equal(formatBaht('1000000.01'), '฿1,000,000.01')
  assert.equal(formatBaht('-1.23'), '-฿1.23')
})
