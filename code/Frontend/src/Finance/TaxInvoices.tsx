'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  decimalCents,
  financeApi,
  formatBaht,
  type FinanceDocument,
  type FinanceInvoice,
} from '../services/finance'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { InvoicePicker } from './InvoicePicker'
import { DocumentPrint } from './DocumentPrint'
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export default function TaxInvoices() {
  const [documents, setDocuments] = useState<FinanceDocument[]>([])
  const [replacementOptions, setReplacementOptions] = useState<FinanceDocument[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([])
  const [invoiceId, setInvoiceId] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today)
  const [replacesId, setReplacesId] = useState('')
  const [preview, setPreview] = useState<FinanceDocument | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const loadRevision = useRef(0)
  const load = useCallback(async () => {
    const revision = ++loadRevision.current
    setLoading(true)
    setError('')
    try {
      const [d, i, selectedInvoice] = await Promise.all([
        financeApi.documentPage({ type: 'TAX_INVOICE', page, limit: 20 }),
        financeApi.invoices({ page: 1, limit: 100 }),
        invoiceId ? financeApi.invoice(invoiceId) : Promise.resolve(null),
      ])
      if (revision !== loadRevision.current) return
      setDocuments(d.items)
      setTotal(d.total)
      setInvoices(
        selectedInvoice
          ? [selectedInvoice, ...i.items.filter((item) => item.id !== selectedInvoice.id)]
          : i.items,
      )
    } catch (reason) {
      if (revision !== loadRevision.current) return
      setError(reason instanceof Error ? reason.message : 'Could not load tax invoices')
    } finally {
      if (revision === loadRevision.current) setLoading(false)
    }
  }, [page, invoiceId])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void load()
    })
    return () => {
      active = false
    }
  }, [load])
  useEffect(() => {
    if (!invoiceId) return
    let active = true
    void financeApi
      .documents(invoiceId)
      .then((items) => {
        if (active) setReplacementOptions(items)
      })
      .catch(() => {
        if (active) setReplacementOptions([])
      })
    return () => {
      active = false
    }
  }, [invoiceId, documents])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await financeApi.issueTax({
        invoiceId,
        date,
        baseAmount,
        description,
        ...(replacesId ? { replacesId } : {}),
      })
      toast.success('Tax invoice issued')
      setBaseAmount('')
      setDescription('')
      setReplacesId('')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not issue tax invoice')
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (doc: FinanceDocument) => {
    const reason = window.prompt('Reason for cancellation')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      await financeApi.cancelDocument(doc, reason)
      toast.success('Document cancelled')
      await load()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not cancel document')
      await load()
    } finally {
      setBusy(false)
    }
  }
  const selected = invoices.find((i) => i.id === invoiceId)
  const net = selected
    ? (decimalCents(selected.subtotal) ?? 0n) - (decimalCents(selected.discount) ?? 0n)
    : 0n
  const remaining = net - (decimalCents(selected?.taxIssuedBase ?? '0') ?? 0n)
  return (
    <FinanceShell
      title="Tax invoices"
      description="Issue VAT tax invoices in installments. Cancel incorrect documents and issue a replacement with a new number."
    >
      {loading && <p role="status">Loading…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}{' '}
          <button className={secondary} onClick={() => void load()}>
            Retry
          </button>
        </p>
      )}
      <form className={`${panel} space-y-4`} onSubmit={(event) => void submit(event)}>
        <h2 className="font-semibold">Issue tax invoice</h2>
        <InvoicePicker
          value={invoiceId}
          statuses={['ISSUED', 'PARTIALLY_PAID', 'PAID']}
          onSelect={(invoice) => {
            setInvoiceId(invoice?.id ?? '')
            setReplacesId('')
            if (invoice)
              setInvoices((current) => [
                invoice,
                ...current.filter((item) => item.id !== invoice.id),
              ])
          }}
        />
        {selected && (
          <p>
            Remaining taxable base:{' '}
            {formatBaht(`${remaining / 100n}.${(remaining % 100n).toString().padStart(2, '0')}`)}
          </p>
        )}
        <label className="block text-sm">
          Issue date
          <input
            className={input}
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          Taxable base THB
          <input
            className={input}
            inputMode="decimal"
            required
            value={baseAmount}
            onChange={(event) => setBaseAmount(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          Service description
          <input
            className={input}
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          Replaces cancelled document (optional)
          <select
            className={input}
            value={replacesId}
            onChange={(event) => setReplacesId(event.target.value)}
          >
            <option value="">No replacement</option>
            {replacementOptions
              .filter(
                (d) =>
                  d.status === 'CANCELLED' && d.type === 'TAX_INVOICE' && d.invoiceId === invoiceId,
              )
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.number}
                </option>
              ))}
          </select>
        </label>
        <button className={primary} disabled={busy}>
          {busy ? 'Issuing…' : 'Issue tax invoice'}
        </button>
      </form>
      <section className={panel}>
        <h2 className="mb-4 font-semibold">Documents</h2>
        {!documents.length && <p className="text-text-secondary">No documents yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr>
                <th>Number</th>
                <th>Type</th>
                <th>Date</th>
                <th>Base</th>
                <th>VAT</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-3">
                    {d.number}
                    {d.replacesId && <small className="block">Replacement</small>}
                  </td>
                  <td>{d.type}</td>
                  <td>{d.date}</td>
                  <td>{formatBaht(d.baseAmount)}</td>
                  <td>{formatBaht(d.vatAmount)}</td>
                  <td>{d.status}</td>
                  <td className="space-x-2">
                    <button className="text-primary" onClick={() => setPreview(d)}>
                      Preview
                    </button>
                    {d.status === 'ISSUED' && (
                      <button
                        className="text-destructive"
                        disabled={busy}
                        onClick={() => void cancel(d)}
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
      {preview && <DocumentPrint document={preview} onClose={() => setPreview(null)} />}
    </FinanceShell>
  )
}
