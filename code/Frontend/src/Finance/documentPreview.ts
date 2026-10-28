import { DEFAULT_DOCUMENT_BRAND_COLOR } from '../constants/colors'
import type { Client } from '../types/client'
import type {
  FinanceInvoice,
  FinanceLine,
  FinanceQuotation,
  FinanceSettings,
  SalesDocumentInput,
} from '../services/finance'

export type SalesKind = 'INVOICE' | 'QUOTATION'
export interface SalesPreview {
  kind: SalesKind
  example: boolean
  status: string
  number: string | null
  issueDate: string
  dueDate?: string
  validUntil?: string
  lines: FinanceLine[]
  subtotal: string
  discount: string
  vatRate: string
  vat: string
  total: string
  note: string
  sellerSnapshot: string | null
  buyerSnapshot: string | null
  brandSnapshot: string | null
  errors: string[]
}
const maxMoney = 99999999999999999n
const money = (cents: bigint) => `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`
function scaled(value: string, digits: number, integral: number): bigint | null {
  if (!new RegExp(`^\\d{1,${integral}}(?:\\.\\d{1,${digits}})?$`).test(value)) return null
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 10n ** BigInt(digits) + BigInt(fraction.padEnd(digits, '0'))
}

/** Same line-first HALF_UP calculation as FinancePolicy; never use floating point for money. */
export function calculatePreview(lines: FinanceLine[], discount: string, vatRate: string) {
  const errors: string[] = []
  let subtotal = 0n
  let valid = lines.length > 0 && lines.length <= 100
  if (!valid) errors.push('Add between 1 and 100 service lines.')
  const calculated = lines.map((line, index) => {
    const quantity = scaled(line.quantity, 3, 12)
    const price = scaled(line.unitPrice, 2, 15)
    if (quantity === null || quantity <= 0n || price === null) {
      errors.push(
        `Line ${index + 1}: enter a positive quantity (up to 3 decimals) and a non-negative price (up to 2 decimals).`,
      )
      valid = false
      return { ...line, amount: '' }
    }
    const amount = (quantity * price + 500n) / 1000n
    if (amount > maxMoney) {
      errors.push(`Line ${index + 1}: amount exceeds the supported limit.`)
      valid = false
      return { ...line, amount: '' }
    }
    subtotal += amount
    return { ...line, amount: money(amount) }
  })
  if (subtotal > maxMoney) {
    valid = false
    errors.push('Subtotal exceeds the supported limit.')
  }
  const subtotalText = valid ? money(subtotal) : ''
  const discountValue = scaled(discount, 2, 15)
  const rate = scaled(vatRate, 2, 3)
  if (discountValue === null) errors.push('Enter a non-negative discount with up to 2 decimals.')
  else if (valid && discountValue > subtotal) errors.push('Discount cannot exceed subtotal.')
  if (rate === null || rate > 10000n)
    errors.push('VAT must be between 0 and 100, with up to 2 decimals.')
  let vat = ''
  let total = ''
  if (
    valid &&
    discountValue !== null &&
    discountValue <= subtotal &&
    rate !== null &&
    rate <= 10000n
  ) {
    const net = subtotal - discountValue
    const tax = (net * rate + 5000n) / 10000n
    if (net + tax > maxMoney) errors.push('Total exceeds the supported limit.')
    else {
      vat = money(tax)
      total = money(net + tax)
    }
  }
  return {
    lines: calculated,
    subtotal: subtotalText,
    discount: discountValue === null ? '' : money(discountValue),
    vatRate,
    vat,
    total,
    errors,
  }
}

function identity(settings: FinanceSettings | null, client?: Client) {
  return {
    sellerSnapshot: JSON.stringify({
      business_name: settings?.businessName ?? '',
      address: settings?.address ?? '',
      tax_id: settings?.taxId ?? '',
      branch: settings?.branch ?? '',
      logo_asset_id: settings?.logoAssetId ?? '',
      bank_details: settings?.bankDetails ?? '',
    }),
    buyerSnapshot: JSON.stringify({
      name: client?.name ?? '',
      company_name: client?.company_name ?? '',
      address: client?.address ?? '',
      tax_id: client?.tax_id ?? '',
    }),
    brandSnapshot: JSON.stringify({
      color: settings?.brandColor ?? DEFAULT_DOCUMENT_BRAND_COLOR,
      footer: settings?.footer ?? '',
    }),
  }
}
export function formPreview(
  kind: SalesKind,
  input: SalesDocumentInput,
  settings: FinanceSettings | null,
  client?: Client,
): SalesPreview {
  return {
    kind,
    example: true,
    status: 'DRAFT',
    number: null,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    validUntil: input.validUntil,
    note: input.note,
    ...identity(settings, client),
    ...calculatePreview(input.lines, input.discount, input.vatRate),
  }
}
export function savedPreview(
  item: FinanceInvoice | FinanceQuotation,
  kind: SalesKind,
  settings: FinanceSettings | null,
  client?: Client,
): SalesPreview {
  return {
    ...item,
    kind,
    example: false,
    errors: [],
    // Issued and cancelled documents always retain their original snapshots.
    ...(item.status === 'DRAFT' ? identity(settings, client) : {}),
  }
}
export function bangkokToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
