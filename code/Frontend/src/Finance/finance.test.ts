import assert from 'node:assert/strict'
import test from 'node:test'
import {
  financeTotals,
  invoiceBalance,
  invoiceStatus,
  invoiceTotal,
  parseMoney,
  sampleState,
} from './finance'

test('invoice balance and finance totals change once for a partial and full payment', () => {
  const state = structuredClone(sampleState)
  const invoice = state.invoices[0]
  assert.equal(invoiceTotal(invoice), 2_500_000)
  assert.equal(invoiceStatus(invoice, state.payments), 'ISSUED')
  state.payments.push({
    id: 'p1',
    invoiceId: invoice.id,
    date: '2026-09-12',
    amountCents: 1_000_000,
    note: '',
  })
  state.transactions.push({
    id: 'income-p1',
    kind: 'income',
    paymentId: 'p1',
    date: '2026-09-12',
    description: 'Payment',
    category: 'Invoice payment',
    project: invoice.project,
    amountCents: 1_000_000,
  })
  assert.equal(invoiceStatus(invoice, state.payments), 'PARTIALLY_PAID')
  assert.equal(invoiceBalance(invoice, state.payments), 1_500_000)
  assert.equal(financeTotals(state).outstanding, 1_500_000)
  assert.equal(financeTotals(state).income, 1_850_000)
  state.payments.push({
    id: 'p2',
    invoiceId: invoice.id,
    date: '2026-09-13',
    amountCents: 1_500_000,
    note: '',
  })
  state.transactions.push({
    id: 'income-p2',
    kind: 'income',
    paymentId: 'p2',
    date: '2026-09-13',
    description: 'Payment',
    category: 'Invoice payment',
    project: invoice.project,
    amountCents: 1_500_000,
  })
  assert.equal(invoiceStatus(invoice, state.payments), 'PAID')
  assert.equal(invoiceBalance(invoice, state.payments), 0)
  assert.equal(financeTotals(state).outstanding, 0)
  assert.equal(financeTotals(state).income, 3_350_000)
})

test('THB input accepts only positive values with at most two decimal places', () => {
  assert.equal(parseMoney('10.05'), 1005)
  assert.equal(parseMoney('0.01'), 1)
  for (const invalid of ['', '0', '-2', '1.234', '1e3', 'Infinity'])
    assert.equal(parseMoney(invalid), null)
})
