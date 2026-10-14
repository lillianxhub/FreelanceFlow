'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  invoiceBalance,
  invoiceStatus,
  sampleState,
  type FinanceState,
  type Invoice,
  type Payment,
  type Transaction,
} from './finance'

interface FinanceContextValue {
  state: FinanceState
  saveTransaction: (item: Transaction) => void
  deleteTransaction: (id: string) => void
  saveInvoice: (item: Invoice) => void
  deleteInvoice: (id: string) => void
  issueInvoice: (id: string) => void
  recordPayment: (payment: Payment) => void
}
const FinanceContext = createContext<FinanceContextValue | null>(null)
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => structuredClone(sampleState))
  const saveTransaction = (item: Transaction) =>
    setState((old) => {
      if (item.paymentId) throw new Error('Invoice payments must be managed in Payments')
      return {
        ...old,
        transactions: [...old.transactions.filter((entry) => entry.id !== item.id), item],
      }
    })
  const deleteTransaction = (id: string) =>
    setState((old) => ({
      ...old,
      transactions: old.transactions.filter((item) => item.id !== id || Boolean(item.paymentId)),
    }))
  const saveInvoice = (item: Invoice) =>
    setState((old) => {
      const current = old.invoices.find((invoice) => invoice.id === item.id)
      if (current && current.status !== 'DRAFT')
        throw new Error('Only draft invoices can be edited')
      return {
        ...old,
        invoices: [
          ...old.invoices.filter((invoice) => invoice.id !== item.id),
          { ...item, status: 'DRAFT' },
        ],
      }
    })
  const deleteInvoice = (id: string) =>
    setState((old) => ({
      ...old,
      invoices: old.invoices.filter((invoice) => invoice.id !== id || invoice.status !== 'DRAFT'),
    }))
  const issueInvoice = (id: string) =>
    setState((old) => ({
      ...old,
      invoices: old.invoices.map((invoice) =>
        invoice.id === id && invoice.status === 'DRAFT'
          ? { ...invoice, status: 'ISSUED' }
          : invoice,
      ),
    }))
  const recordPayment = (payment: Payment) =>
    setState((old) => {
      const invoice = old.invoices.find((item) => item.id === payment.invoiceId)
      if (!invoice || invoiceStatus(invoice, old.payments) === 'DRAFT') return old
      if (payment.amountCents <= 0 || payment.amountCents > invoiceBalance(invoice, old.payments))
        return old
      return {
        ...old,
        payments: [...old.payments, payment],
        transactions: [
          ...old.transactions,
          {
            id: `income-${payment.id}`,
            kind: 'income',
            date: payment.date,
            description: `Payment for ${invoice.number}`,
            category: 'Invoice payment',
            project: invoice.project,
            amountCents: payment.amountCents,
            paymentId: payment.id,
          },
        ],
      }
    })
  return (
    <FinanceContext.Provider
      value={{
        state,
        saveTransaction,
        deleteTransaction,
        saveInvoice,
        deleteInvoice,
        issueInvoice,
        recordPayment,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}
export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('FinanceProvider is required')
  return context
}
