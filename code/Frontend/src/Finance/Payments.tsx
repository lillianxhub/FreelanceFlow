'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  decimalCents,
  financeApi,
  formatBaht,
  type FinanceDocument,
  type FinanceInvoice,
  type FinancePayment,
} from '../services/finance'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'
import { InvoicePicker } from './InvoicePicker'
import { DocumentPrint } from './DocumentPrint'

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export default function Payments() {
  const [items, setItems] = useState<FinancePayment[]>([])
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([])
  const [preview, setPreview] = useState<FinanceDocument | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [invoiceId, setInvoiceId] = useState('')
  const [date, setDate] = useState(today)
  const [received, setReceived] = useState('')
  const [withheld, setWithheld] = useState('0')
  const [method, setMethod] = useState('Bank transfer')
  const [reference, setReference] = useState('')
  const [certificate, setCertificate] = useState('')
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID())
  const loadRevision = useRef(0)
  const load = useCallback(async () => {
    const revision = ++loadRevision.current
    setLoading(true)
    setError('')
    try {
      const [payments, invoicePage] = await Promise.all([
        financeApi.payments({ page, limit: 20, search, status, from, to }),
        financeApi.invoices({ page: 1, limit: 100 }),
      ])
      if (revision !== loadRevision.current) return
      setItems(payments.items)
      setTotal(payments.total)
      setInvoices(invoicePage.items)
    } catch (reason) {
      if (revision !== loadRevision.current) return
      setError(reason instanceof Error ? reason.message : 'Could not load payments')
    } finally {
      if (revision === loadRevision.current) setLoading(false)
    }
  }, [page, search, status, from, to])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void load()
    })
    return () => {
      active = false
    }
  }, [load])
  const selected = invoices.find((item) => item.id === invoiceId)
  const balance = selected
    ? (decimalCents(selected.total) ?? 0n) - (decimalCents(selected.paid) ?? 0n)
    : 0n
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await financeApi.recordPayment({
        invoiceId,
        date,
        received,
        withheld,
        method,
        reference,
        withholdingCertificate: certificate,
        idempotencyKey: requestKey,
      })
      toast.success('Payment recorded and receipt issued')
      setOpen(false)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record payment')
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (item: FinancePayment) => {
    const reason = window.prompt('Reason for cancellation')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      await financeApi.cancelPayment(item, reason)
      toast.success('Payment cancelled')
      await load()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not cancel payment')
      await load()
    } finally {
      setBusy(false)
    }
  }
  return (
    <FinanceShell
      title="Payments"
      description="Record cash received and customer withholding. Each payment creates a receipt."
    >
      <div className="flex justify-end">
        <button
          className={primary}
          onClick={() => {
            setRequestKey(crypto.randomUUID())
            setInvoiceId('')
            setReceived('')
            setWithheld('0')
            setDate(today())
            setError('')
            setOpen(true)
          }}
        >
          Record payment
        </button>
      </div>
      <section className={panel}>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <input
            aria-label="Search payments"
            className={input}
            placeholder="Invoice or reference"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <select
            aria-label="Payment status"
            className={input}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Recorded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <label className="text-sm">
            From
            <input
              className={input}
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="text-sm">
            To
            <input
              className={input}
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
            />
          </label>
        </div>
        {loading && <p role="status">Loading…</p>}
        {error && !open && (
          <p role="alert">
            {error}{' '}
            <button className={secondary} onClick={() => void load()}>
              Retry
            </button>
          </p>
        )}
        {!loading && !items.length && (
          <p className="py-8 text-center text-text-secondary">No payments yet.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Received</th>
                <th>Withheld</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="py-3">{item.date}</td>
                  <td>{invoices.find((i) => i.id === item.invoiceId)?.number ?? item.invoiceId}</td>
                  <td>{formatBaht(item.received)}</td>
                  <td>{formatBaht(item.withheld)}</td>
                  <td>{item.cancelled ? 'Cancelled' : 'Recorded'}</td>
                  <td className="space-x-2">
                    <button
                      className="text-primary"
                      onClick={() => {
                        void financeApi
                          .receipt(item.id)
                          .then(setPreview)
                          .catch((reason) =>
                            toast.error(
                              reason instanceof Error ? reason.message : 'Could not load receipt',
                            ),
                          )
                      }}
                    >
                      Receipt
                    </button>
                    {!item.cancelled && (
                      <button
                        className="text-destructive"
                        disabled={busy}
                        onClick={() => void cancel(item)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className={secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} · {total} total
          </span>
          <button
            className={secondary}
            disabled={page * 20 >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
          <SheetTitle>Record payment</SheetTitle>
          <SheetDescription>
            Received cash plus withheld tax reduces the invoice balance.
          </SheetDescription>
          <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
            <InvoicePicker
              value={invoiceId}
              statuses={['ISSUED', 'PARTIALLY_PAID']}
              onSelect={(invoice) => {
                setInvoiceId(invoice?.id ?? '')
                if (invoice)
                  setInvoices((current) => [
                    invoice,
                    ...current.filter((item) => item.id !== invoice.id),
                  ])
              }}
            />
            {selected && (
              <p>
                Outstanding:{' '}
                {formatBaht(`${balance / 100n}.${(balance % 100n).toString().padStart(2, '0')}`)}
              </p>
            )}
            <label className="block text-sm">
              Date
              <input
                className={input}
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Cash received (THB)
              <input
                className={input}
                required
                inputMode="decimal"
                value={received}
                onChange={(event) => setReceived(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Withheld tax (THB)
              <input
                className={input}
                required
                inputMode="decimal"
                value={withheld}
                onChange={(event) => setWithheld(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Method
              <input
                className={input}
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Reference
              <input
                className={input}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Received 50 bis certificate number
              <input
                className={input}
                value={certificate}
                onChange={(event) => setCertificate(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <button className={primary} disabled={busy}>
              {busy ? 'Saving…' : 'Record payment'}
            </button>
          </form>
        </SheetContent>
      </Sheet>
      {preview && <DocumentPrint document={preview} onClose={() => setPreview(null)} />}
    </FinanceShell>
  )
}
