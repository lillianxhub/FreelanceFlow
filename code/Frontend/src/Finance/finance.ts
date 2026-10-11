export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID'
export type TransactionKind = 'income' | 'expense'

export interface Transaction {
  id: string
  kind: TransactionKind
  date: string
  description: string
  category: string
  project: string
  amountCents: number
  paymentId?: string
}
export interface InvoiceLine {
  description: string
  quantity: number
  unitCents: number
}
export interface Invoice {
  id: string
  number: string
  client: string
  project: string
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  lines: InvoiceLine[]
}
export interface Payment {
  id: string
  invoiceId: string
  date: string
  amountCents: number
  note: string
}
export interface FinanceState {
  transactions: Transaction[]
  invoices: Invoice[]
  payments: Payment[]
}

export const sampleState: FinanceState = {
  transactions: [
    {
      id: 'income-1',
      kind: 'income',
      date: '2026-09-05',
      description: 'Consulting session',
      category: 'Services',
      project: 'Website redesign',
      amountCents: 850000,
    },
    {
      id: 'expense-1',
      kind: 'expense',
      date: '2026-09-03',
      description: 'Design software',
      category: 'Software',
      project: 'Website redesign',
      amountCents: 129900,
    },
    {
      id: 'expense-2',
      kind: 'expense',
      date: '2026-09-08',
      description: 'Travel to client',
      category: 'Travel',
      project: 'Brand identity',
      amountCents: 45000,
    },
  ],
  invoices: [
    {
      id: 'invoice-1',
      number: 'SAMPLE-001',
      client: 'Northstar Studio',
      project: 'Website redesign',
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      status: 'ISSUED',
      lines: [{ description: 'Website design', quantity: 1, unitCents: 2500000 }],
    },
    {
      id: 'invoice-2',
      number: 'SAMPLE-002',
      client: 'Good Goods Co.',
      project: 'Brand identity',
      issueDate: '2026-09-10',
      dueDate: '2026-10-10',
      status: 'DRAFT',
      lines: [{ description: 'Brand concept', quantity: 2, unitCents: 700000 }],
    },
  ],
  payments: [],
}

export const invoiceTotal = (invoice: Invoice) =>
  invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0)
export const invoicePaid = (invoice: Invoice, payments: Payment[]) =>
  payments
    .filter((payment) => payment.invoiceId === invoice.id)
    .reduce((sum, payment) => sum + payment.amountCents, 0)
export const invoiceBalance = (invoice: Invoice, payments: Payment[]) =>
  invoiceTotal(invoice) - invoicePaid(invoice, payments)
export const invoiceStatus = (invoice: Invoice, payments: Payment[]): InvoiceStatus => {
  if (invoice.status === 'DRAFT') return 'DRAFT'
  const paid = invoicePaid(invoice, payments)
  return paid >= invoiceTotal(invoice) ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'ISSUED'
}
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'THB' }).format(cents / 100)
export const parseMoney = (value: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  const [whole, fraction = ''] = value.trim().split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}
export const financeTotals = (state: FinanceState) => {
  const income = state.transactions
    .filter((item) => item.kind === 'income')
    .reduce((sum, item) => sum + item.amountCents, 0)
  const expenses = state.transactions
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.amountCents, 0)
  const outstanding = state.invoices
    .filter((invoice) => invoice.status !== 'DRAFT')
    .reduce((sum, invoice) => sum + invoiceBalance(invoice, state.payments), 0)
  return { income, expenses, net: income - expenses, outstanding }
}
