import { api } from '../api/apiClient'

export type Decimal = string
export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}
export interface FinanceSummary {
  income: Decimal
  expenses: Decimal
  net: Decimal
  outstanding: Decimal
  vat: Decimal
  withheld: Decimal
  cashByMonth: { month: string; income: Decimal; expenses: Decimal }[]
}
export interface FinanceTransaction {
  id: string
  kind: 'INCOME' | 'EXPENSE'
  date: string
  description: string
  category: string
  projectId: string | null
  amount: Decimal
  paymentId: string | null
  cancelled: boolean
  version: number
}
export interface FinanceLine {
  description: string
  quantity: string
  unit: string
  unitPrice: Decimal
  amount?: Decimal
}
export interface FinanceInvoice {
  id: string
  number: string | null
  clientId: string
  projectId: string | null
  issueDate: string
  dueDate: string
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
  subtotal: Decimal
  discount: Decimal
  vatRate: Decimal
  vat: Decimal
  total: Decimal
  paid: Decimal
  version: number
  lines: FinanceLine[]
  sellerSnapshot: string | null
  buyerSnapshot: string | null
  brandSnapshot: string | null
  note: string
  taxIssuedBase: Decimal
  sourceQuotationId: string | null
}
export interface FinanceQuotation {
  id: string
  number: string | null
  clientId: string
  projectId: string | null
  issueDate: string
  validUntil: string
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED'
  subtotal: Decimal
  discount: Decimal
  vatRate: Decimal
  vat: Decimal
  total: Decimal
  version: number
  lines: FinanceLine[]
  sellerSnapshot: string | null
  buyerSnapshot: string | null
  brandSnapshot: string | null
  note: string
  invoiceId: string | null
}
export interface SalesDocumentInput {
  clientId: string
  projectId: string | null
  issueDate: string
  dueDate?: string
  validUntil?: string
  vatRate: string
  discount: string
  note: string
  lines: FinanceLine[]
  version?: number
}
export interface FinancePayment {
  id: string
  invoiceId: string
  date: string
  received: Decimal
  withheld: Decimal
  method: string
  reference: string
  withholdingCertificate: string
  cancelled: boolean
  version: number
}
export interface FinanceSettings {
  businessName: string
  address: string
  taxId: string
  branch: string
  vatRegistered: boolean
  bankDetails: string
  footer: string
  brandColor: string
  logoAssetId: string | null
  version: number
}
export interface FinancePreset {
  id: string
  name: string
  description: string
  quantity: string
  unit: string
  unitPrice: Decimal
  suggestedVatRate: Decimal
  version: number
}
export interface FinanceCategory {
  id: string
  kind: 'INCOME' | 'EXPENSE'
  name: string
  version: number
}
export interface FinanceDocument {
  id: string
  invoiceId: string
  paymentId: string | null
  type: 'RECEIPT' | 'TAX_INVOICE'
  number: string
  date: string
  status: 'ISSUED' | 'CANCELLED'
  baseAmount: Decimal
  vatAmount: Decimal
  description: string
  sellerSnapshot: string
  buyerSnapshot: string
  brandSnapshot: string
  replacesId: string | null
  version: number
}

const query = (params: Record<string, string | number | undefined>) => {
  const values = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') values.set(key, String(value))
  })
  return values.toString()
}
const list = async <T>(path: string): Promise<Page<T>> => {
  const result = await api.get<T[]>(path)
  return {
    items: result.data,
    total: result.meta?.total ?? result.data.length,
    page: result.meta?.page ?? 1,
    limit: result.meta?.limit ?? result.data.length,
  }
}
export const financeApi = {
  quotations: (params: Record<string, string | number | undefined>) =>
    list<FinanceQuotation>(`/finance/quotations?${query(params)}`),
  quotation: async (id: string) =>
    (await api.get<FinanceQuotation>(`/finance/quotations/${id}`)).data,
  saveQuotation: async (input: SalesDocumentInput, id?: string) =>
    (
      await (id
        ? api.put<FinanceQuotation>(`/finance/quotations/${id}`, input)
        : api.post<FinanceQuotation>('/finance/quotations', input))
    ).data,
  issueQuotation: async (item: FinanceQuotation) =>
    (
      await api.post<FinanceQuotation>(`/finance/quotations/${item.id}/issue`, {
        version: item.version,
      })
    ).data,
  cancelQuotation: async (item: FinanceQuotation, reason: string) =>
    (
      await api.post<FinanceQuotation>(`/finance/quotations/${item.id}/cancel`, {
        version: item.version,
        reason,
      })
    ).data,
  quotationInvoice: async (item: FinanceQuotation, issueDate: string, dueDate: string) =>
    (
      await api.post<FinanceInvoice>(`/finance/quotations/${item.id}/invoice`, {
        version: item.version,
        issueDate,
        dueDate,
      })
    ).data,
  summary: async () => (await api.get<FinanceSummary>('/finance/summary')).data,
  transactions: (params: Record<string, string | number | undefined>) =>
    list<FinanceTransaction>(`/finance/transactions?${query(params)}`),
  saveTransaction: async (input: Partial<FinanceTransaction> & { amount: string }, id?: string) =>
    (
      await (id
        ? api.put<FinanceTransaction>(`/finance/transactions/${id}`, input)
        : api.post<FinanceTransaction>('/finance/transactions', input))
    ).data,
  cancelTransaction: async (item: FinanceTransaction, reason: string) =>
    (
      await api.post<FinanceTransaction>(`/finance/transactions/${item.id}/cancel`, {
        version: item.version,
        reason,
      })
    ).data,
  invoices: (params: Record<string, string | number | undefined>) =>
    list<FinanceInvoice>(`/finance/invoices?${query(params)}`),
  invoice: async (id: string) => (await api.get<FinanceInvoice>(`/finance/invoices/${id}`)).data,
  saveInvoice: async (input: Partial<FinanceInvoice>, id?: string) =>
    (
      await (id
        ? api.put<FinanceInvoice>(`/finance/invoices/${id}`, input)
        : api.post<FinanceInvoice>('/finance/invoices', input))
    ).data,
  issueInvoice: async (item: FinanceInvoice) =>
    (
      await api.post<FinanceInvoice>(`/finance/invoices/${item.id}/issue`, {
        version: item.version,
      })
    ).data,
  cancelInvoice: async (item: FinanceInvoice, reason: string) =>
    (
      await api.post<FinanceInvoice>(`/finance/invoices/${item.id}/cancel`, {
        version: item.version,
        reason,
      })
    ).data,
  payments: (params: Record<string, string | number | undefined>) =>
    list<FinancePayment>(`/finance/payments?${query(params)}`),
  recordPayment: async (input: Record<string, string>) =>
    (await api.post<FinancePayment>('/finance/payments', input)).data,
  cancelPayment: async (item: FinancePayment, reason: string) =>
    (
      await api.post<FinancePayment>(`/finance/payments/${item.id}/cancel`, {
        version: item.version,
        reason,
      })
    ).data,
  settings: async () => (await api.get<FinanceSettings>('/finance/settings')).data,
  saveSettings: async (input: FinanceSettings) =>
    (await api.put<FinanceSettings>('/finance/settings', input)).data,
  presets: async () => (await api.get<FinancePreset[]>('/finance/presets')).data,
  categories: async () => (await api.get<FinanceCategory[]>('/finance/categories')).data,
  createCategory: async (kind: FinanceCategory['kind'], name: string) =>
    (await api.post<FinanceCategory>('/finance/categories', { kind, name })).data,
  deleteCategory: async (item: FinanceCategory) =>
    (await api.delete(`/finance/categories/${item.id}?version=${item.version}`)).data,
  savePreset: async (input: Partial<FinancePreset>, id?: string) =>
    (
      await (id
        ? api.put<FinancePreset>(`/finance/presets/${id}`, input)
        : api.post<FinancePreset>('/finance/presets', input))
    ).data,
  documentPage: (params: Record<string, string | number | undefined>) =>
    list<FinanceDocument>(`/finance/documents?${query(params)}`),
  documents: async (invoiceId?: string) =>
    (await list<FinanceDocument>(`/finance/documents?${query({ invoiceId, page: 1, limit: 100 })}`))
      .items,
  receipt: async (paymentId: string) =>
    (await api.get<FinanceDocument>(`/finance/documents/receipt/${paymentId}`)).data,
  issueTax: async (input: Record<string, string>) =>
    (await api.post<FinanceDocument>('/finance/tax-invoices', input)).data,
  cancelDocument: async (item: FinanceDocument, reason: string) =>
    (
      await api.post<FinanceDocument>(`/finance/documents/${item.id}/cancel`, {
        version: item.version,
        reason,
      })
    ).data,
}

export const decimalCents = (value: string): bigint | null => {
  if (!/^-?\d{1,15}(?:\.\d{1,2})?$/.test(value)) return null
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  return negative ? -cents : cents
}
export const formatBaht = (value: string) => {
  const cents = decimalCents(value)
  if (cents === null) return '—'
  const negative = cents < 0n
  const absolute = negative ? -cents : cents
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}฿${whole}.${(absolute % 100n).toString().padStart(2, '0')}`
}
