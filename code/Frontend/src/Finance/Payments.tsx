'use client'
import { useState, type FormEvent } from 'react'
import { useFinance } from './FinanceContext'
import { invoiceBalance, invoiceStatus, money, parseMoney } from './finance'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'

export default function Payments() {
  const { state, recordPayment } = useFinance()
  const [open, setOpen] = useState(false)
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const payable = state.invoices.filter(
    (invoice) =>
      invoiceStatus(invoice, state.payments) !== 'DRAFT' &&
      invoiceBalance(invoice, state.payments) > 0,
  )
  const selected = payable.find((invoice) => invoice.id === invoiceId)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cents = parseMoney(amount)
    if (!selected || !date || cents === null || cents > invoiceBalance(selected, state.payments)) {
      setError('Choose an issued invoice and enter a payment within its outstanding balance.')
      return
    }
    try {
      recordPayment({
        id: crypto.randomUUID(),
        invoiceId,
        amountCents: cents,
        date,
        note: note.trim(),
      })
      setOpen(false)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not record payment')
    }
  }
  return (
    <FinanceShell title="Payments" description="Record sample partial or full invoice payments.">
      <div className="flex justify-end">
        <button
          type="button"
          className={primary}
          disabled={!payable.length}
          onClick={() => {
            setInvoiceId('')
            setAmount('')
            setDate('')
            setNote('')
            setError('')
            setOpen(true)
          }}
        >
          Record payment
        </button>
      </div>
      <section className={panel}>
        <input
          aria-label="Search payments"
          className={`${input} mb-4 max-w-sm`}
          placeholder="Search invoice or note"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm">
            <thead className="border-b border-border text-text-secondary">
              <tr>
                <th className="py-3">Date</th>
                <th>Invoice</th>
                <th>Client</th>
                <th>Note</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {state.payments
                .filter((payment) => {
                  const invoice = state.invoices.find((item) => item.id === payment.invoiceId)
                  return `${invoice?.number} ${invoice?.client} ${payment.note}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
                })
                .map((payment) => {
                  const invoice = state.invoices.find((item) => item.id === payment.invoiceId)
                  return (
                    <tr key={payment.id} className="border-b border-border">
                      <td className="py-4">{payment.date}</td>
                      <td>{invoice?.number}</td>
                      <td>{invoice?.client}</td>
                      <td>{payment.note || '—'}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {money(payment.amountCents)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          {!state.payments.length && (
            <p className="py-10 text-center text-text-secondary">
              No sample payments recorded yet.
            </p>
          )}
        </div>
      </section>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-none overflow-y-auto p-6 sm:max-w-md">
          <SheetTitle>Record sample payment</SheetTitle>
          <SheetDescription>
            This updates the invoice balance and income in the prototype.
          </SheetDescription>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block space-y-1 text-sm font-medium">
              Invoice
              <select
                required
                className={input}
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
              >
                <option value="">Select invoice</option>
                {payable.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} · {invoice.client}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <p className="rounded-lg bg-primary-soft p-3 text-sm">
                Outstanding: {money(invoiceBalance(selected, state.payments))}
              </p>
            )}
            <label className="block space-y-1 text-sm font-medium">
              Amount (THB)
              <input
                required
                inputMode="decimal"
                className={input}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              Payment date
              <input
                required
                type="date"
                className={input}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              Note
              <input
                className={input}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" className={primary}>
                Record sample payment
              </button>
              <button type="button" className={secondary} onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </FinanceShell>
  )
}
