'use client'
import { useEffect, useState } from 'react'
import { financeApi, formatBaht, type FinanceInvoice } from '../services/finance'
import { input, secondary } from './FinanceShell'

/** Fetch a page of choices, keeping the selected invoice available across searches. */
export function InvoicePicker({
  value,
  onSelect,
  statuses,
}: {
  value: string
  onSelect: (invoice: FinanceInvoice | null) => void
  statuses: string[]
}) {
  const [items, setItems] = useState<FinanceInvoice[]>([])
  const [selected, setSelected] = useState<FinanceInvoice | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) {
        setLoading(true)
        setError('')
      }
    })
    void financeApi
      .invoices({ search, page, limit: 20 })
      .then((result) => {
        if (!active) return
        setItems(result.items)
        setTotal(result.total)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load invoices')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [search, page, retry])
  const choices = items.filter((item) => statuses.includes(item.status))
  if (selected && value === selected.id && !choices.some((item) => item.id === value))
    choices.unshift(selected)
  return (
    <div className="space-y-2">
      <input
        className={input}
        aria-label="Search invoice choices"
        placeholder="Search invoice or client"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
      />
      <label className="block text-sm">
        Invoice
        <select
          className={input}
          required
          value={value}
          disabled={loading}
          onChange={(event) => {
            const invoice = choices.find((item) => item.id === event.target.value) ?? null
            setSelected(invoice)
            onSelect(invoice)
          }}
        >
          <option value="">Select invoice</option>
          {choices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.number} · {formatBaht(item.total)}
            </option>
          ))}
        </select>
      </label>
      {loading && <p role="status">Loading invoices…</p>}
      {error && (
        <p role="alert">
          {error}{' '}
          <button type="button" className={secondary} onClick={() => setRetry(retry + 1)}>
            Retry
          </button>
        </p>
      )}
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          className={secondary}
          disabled={page <= 1 || loading}
          onClick={() => setPage(page - 1)}
        >
          Previous invoices
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          className={secondary}
          disabled={page * 20 >= total || loading}
          onClick={() => setPage(page + 1)}
        >
          Next invoices
        </button>
      </div>
    </div>
  )
}
