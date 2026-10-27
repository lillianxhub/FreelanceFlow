import assert from 'node:assert/strict'
import test from 'node:test'
import { addDays, calculatePreview, formPreview, savedPreview } from './documentPreview'
import type { FinanceInvoice, SalesDocumentInput } from '../services/finance'
const line = { description: 'งานออกแบบ', quantity: '1.005', unit: 'job', unitPrice: '1.00' }

test('preview rounds each line HALF_UP before discount and VAT, matching server policy', () => {
  const result = calculatePreview([line, line], '0.02', '7')
  assert.deepEqual(
    result.lines.map((item) => item.amount),
    ['1.01', '1.01'],
  )
  assert.equal(result.subtotal, '2.02')
  assert.equal(result.vat, '0.14')
  assert.equal(result.total, '2.14')
  assert.deepEqual(result.errors, [])
})
test('preview preserves large decimals and reports incomplete inputs and overflow without invented totals', () => {
  const large = calculatePreview(
    [{ ...line, quantity: '1', unitPrice: '999999999999999.99' }],
    '0',
    '0',
  )
  assert.equal(large.total, '999999999999999.99')
  for (const input of ['', '-1', '1.0001', 'NaN', '1e3']) {
    const result = calculatePreview([{ ...line, quantity: input }], '0', '0')
    assert.equal(result.total, '')
    assert.ok(result.errors.length)
  }
  assert.equal(calculatePreview([line], '2', '7').total, '')
  assert.equal(calculatePreview([line], '0', '101').total, '')
  assert.equal(
    calculatePreview([{ ...line, quantity: '2', unitPrice: '999999999999999.99' }], '0', '0').total,
    '',
  )
  assert.equal(calculatePreview([], '0', '0').total, '')
})
test('form previews use current values without assigning a document number; issued snapshots remain unchanged', () => {
  const input: SalesDocumentInput = {
    clientId: '',
    projectId: null,
    issueDate: '2026-10-14',
    validUntil: '2026-11-13',
    lines: [line],
    discount: '0',
    vatRate: '0',
    note: 'ตัวอย่าง',
  }
  const first = formPreview('QUOTATION', input, null)
  const changed = formPreview('QUOTATION', { ...input, lines: [{ ...line, quantity: '2' }] }, null)
  assert.equal(first.number, null)
  assert.equal(first.example, true)
  assert.equal(first.total, '1.01')
  assert.equal(changed.total, '2.00')
  const issued = {
    ...first,
    id: 'invoice',
    status: 'ISSUED',
    sellerSnapshot: '{"business_name":"Original"}',
    buyerSnapshot: '{"name":"Original client"}',
    brandSnapshot: '{"color":"#315bd7"}',
  } as unknown as FinanceInvoice
  assert.equal(savedPreview(issued, 'INVOICE', null).sellerSnapshot, issued.sellerSnapshot)
  assert.equal(savedPreview(issued, 'INVOICE', null).example, false)
  assert.equal(addDays('2026-12-20', 30), '2027-01-19')
})
