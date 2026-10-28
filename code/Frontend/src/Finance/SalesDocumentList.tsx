import Link from 'next/link'
import type { Client } from '../types/client'
import { formatBaht, type FinanceInvoice, type FinanceQuotation } from '../services/finance'
import { input, panel, secondary } from './FinanceShell'
import type { SalesKind } from './documentPreview'

export type SalesDocument = FinanceInvoice | FinanceQuotation
type Filters = { search: string; status: string; from: string; to: string }

type Props = {
  kind: SalesKind
  items: SalesDocument[]
  clients: Client[]
  filters: Filters
  onFilterChange: (patch: Partial<Filters>) => void
  pagination: { page: number; total: number; onPageChange: (page: number) => void }
  state: { loading: boolean; error: string; editingOpen: boolean; busy: boolean }
  actions: {
    retry: () => void
    preview: (item: SalesDocument) => void
    edit: (item: SalesDocument) => void
    issue: (item: SalesDocument) => void
    cancel: (item: SalesDocument) => void
    convert: (item: FinanceQuotation) => void
  }
}

export function SalesDocumentList({
  kind,
  items,
  clients,
  filters,
  onFilterChange,
  pagination,
  state,
  actions,
}: Props) {
  const quotation = kind === 'QUOTATION'
  const title = quotation ? 'quotations' : 'invoices'
  return (
    <section className={panel}>
      <input
        className={`${input} mb-4 max-w-sm`}
        aria-label={`Search ${title}`}
        placeholder="Search number or client"
        value={filters.search}
        onChange={(event) => onFilterChange({ search: event.target.value })}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <select
          aria-label={`${quotation ? 'Quotation' : 'Invoice'} status`}
          className={input}
          value={filters.status}
          onChange={(event) => onFilterChange({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          {(quotation
            ? ['DRAFT', 'ISSUED', 'CANCELLED']
            : ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']
          ).map((value) => (
            <option key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <label className="text-sm">
          From
          <input
            className={input}
            type="date"
            value={filters.from}
            onChange={(event) => onFilterChange({ from: event.target.value })}
          />
        </label>
        <label className="text-sm">
          To
          <input
            className={input}
            type="date"
            value={filters.to}
            onChange={(event) => onFilterChange({ to: event.target.value })}
          />
        </label>
      </div>
      {state.loading && <p role="status">Loading…</p>}
      {state.error && !state.editingOpen && (
        <p role="alert">
          {state.error}{' '}
          <button className={secondary} onClick={actions.retry}>
            Retry
          </button>
        </p>
      )}
      {!state.loading && !items.length && (
        <p className="py-8 text-center text-text-secondary">No {title} yet.</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr>
              <th>{quotation ? 'Quotation' : 'Invoice'}</th>
              <th>Client</th>
              <th>{quotation ? 'Valid until' : 'Due'}</th>
              <th>Status</th>
              <th>Total</th>
              {!quotation && <th>Paid</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="py-3">{item.number ?? 'Draft'}</td>
                <td>
                  {clients.find((client) => client.id === item.clientId)?.name ?? item.clientId}
                </td>
                <td>{'validUntil' in item ? item.validUntil : item.dueDate}</td>
                <td>{item.status}</td>
                <td>{formatBaht(item.total)}</td>
                {'paid' in item && <td>{formatBaht(item.paid)}</td>}
                <td className="space-x-2">
                  <button
                    className="text-primary"
                    disabled={state.busy}
                    onClick={() => actions.preview(item)}
                  >
                    Preview
                  </button>
                  {'invoiceId' in item && item.invoiceId && (
                    <Link
                      className="text-primary"
                      href={`/finance/invoices?invoice=${item.invoiceId}`}
                    >
                      Open invoice
                    </Link>
                  )}
                  {'invoiceId' in item && !item.invoiceId && item.status === 'ISSUED' && (
                    <button
                      className="text-primary"
                      disabled={state.busy}
                      onClick={() => actions.convert(item)}
                    >
                      Create invoice
                    </button>
                  )}
                  {item.status === 'DRAFT' && (
                    <>
                      <button className="text-primary" onClick={() => actions.edit(item)}>
                        Edit
                      </button>
                      <button
                        className="text-primary"
                        disabled={state.busy}
                        onClick={() => actions.issue(item)}
                      >
                        Issue
                      </button>
                    </>
                  )}
                  {item.status !== 'CANCELLED' && (
                    <button
                      className="text-destructive"
                      disabled={state.busy}
                      onClick={() => actions.cancel(item)}
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
        <button
          className={secondary}
          disabled={pagination.page <= 1}
          onClick={() => pagination.onPageChange(pagination.page - 1)}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} · {pagination.total} total
        </span>
        <button
          className={secondary}
          disabled={pagination.page * 20 >= pagination.total}
          onClick={() => pagination.onPageChange(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  )
}
