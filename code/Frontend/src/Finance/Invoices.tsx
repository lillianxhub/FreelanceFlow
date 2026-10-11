'use client'
import { useState, type FormEvent } from 'react'
import { useFinance } from './FinanceContext'
import {
  invoiceBalance,
  invoiceStatus,
  invoiceTotal,
  money,
  parseMoney,
  type Invoice,
  type InvoiceLine,
} from './finance'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'

const blankLine = (): InvoiceLine => ({ description: '', quantity: 1, unitCents: 0 })
export default function Invoices() {
  const { state, saveInvoice, deleteInvoice, issueInvoice } = useFinance()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [preview, setPreview] = useState<Invoice | null>(null)
  const [open, setOpen] = useState(false)
  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([blankLine()])
  const [linePrices, setLinePrices] = useState<string[]>([''])
  const [error, setError] = useState('')
  const visible = state.invoices.filter(
    (invoice) =>
      (filter === 'ALL' || invoiceStatus(invoice, state.payments) === filter) &&
      `${invoice.number} ${invoice.client} ${invoice.project}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const edit = (invoice?: Invoice) => {
    setEditing(invoice ?? null)
    setClient(invoice?.client ?? '')
    setProject(invoice?.project ?? '')
    setIssueDate(invoice?.issueDate ?? '')
    setDueDate(invoice?.dueDate ?? '')
    setLines(invoice ? invoice.lines.map((line) => ({ ...line })) : [blankLine()])
    setLinePrices(invoice ? invoice.lines.map((line) => (line.unitCents / 100).toFixed(2)) : [''])
    setError('')
    setOpen(true)
  }
  const updateLine = (index: number, patch: Partial<InvoiceLine>) =>
    setLines((old) => old.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (
      !client.trim() ||
      !project.trim() ||
      !issueDate ||
      !dueDate ||
      dueDate < issueDate ||
      !lines.length ||
      lines.some(
        (line) =>
          !line.description.trim() ||
          !Number.isSafeInteger(line.quantity) ||
          line.quantity <= 0 ||
          !Number.isSafeInteger(line.unitCents) ||
          line.unitCents <= 0,
      )
    ) {
      setError(
        'Complete the invoice, add a valid line item, and choose a due date on or after the issue date.',
      )
      return
    }
    const invoice: Invoice = {
      id: editing?.id ?? crypto.randomUUID(),
      number:
        editing?.number ??
        `SAMPLE-${String(Math.max(0, ...state.invoices.map((item) => Number(item.number.match(/^SAMPLE-(\d+)$/)?.[1] ?? 0))) + 1).padStart(3, '0')}`,
      client: client.trim(),
      project: project.trim(),
      issueDate,
      dueDate,
      status: 'DRAFT',
      lines,
    }
    saveInvoice(invoice)
    setOpen(false)
  }
  return (
    <FinanceShell
      title="Invoices"
      description="Create and preview sample invoices. No invoice is sent."
    >
      <div className="flex justify-end">
        <button type="button" className={primary} onClick={() => edit()}>
          New invoice
        </button>
      </div>
      <section className={panel}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Search invoices"
            className={input}
            placeholder="Search invoice, client, or project"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Filter invoice status"
            className={input}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID'].map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-text-secondary">
              <tr>
                <th className="py-3">Invoice</th>
                <th>Client</th>
                <th>Due</th>
                <th>Status</th>
                <th className="text-right">Total</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border last:border-0">
                  <td className="py-4 font-semibold">{invoice.number}</td>
                  <td>{invoice.client}</td>
                  <td>{invoice.dueDate}</td>
                  <td>
                    <span className="rounded bg-primary-soft px-2 py-1 text-xs text-primary-dark">
                      {invoiceStatus(invoice, state.payments).replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{money(invoiceTotal(invoice))}</td>
                  <td className="text-right tabular-nums">
                    {money(invoiceBalance(invoice, state.payments))}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="px-1 text-primary"
                      onClick={() => setPreview(invoice)}
                    >
                      Preview
                    </button>
                    {invoice.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          className="px-1 text-primary"
                          onClick={() => edit(invoice)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="px-1 text-primary"
                          onClick={() => issueInvoice(invoice.id)}
                        >
                          Issue demo
                        </button>
                        <button
                          type="button"
                          className="px-1 text-destructive"
                          onClick={() => {
                            if (window.confirm('Delete this draft?')) deleteInvoice(invoice.id)
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="py-10 text-center text-text-secondary">No invoices match your filters.</p>
          )}
        </div>
      </section>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-none overflow-y-auto p-6 sm:max-w-[720px]"
        >
          <SheetTitle>{editing ? `Edit ${editing.number}` : 'New invoice'}</SheetTitle>
          <SheetDescription>Save a sample draft. No email will be sent.</SheetDescription>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Client
                <input
                  required
                  className={input}
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Project
                <input
                  required
                  className={input}
                  value={project}
                  onChange={(event) => setProject(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Issue date
                <input
                  required
                  type="date"
                  className={input}
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Due date
                <input
                  required
                  type="date"
                  className={input}
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </div>
            <h3 className="font-semibold">Line items</h3>
            {lines.map((line, index) => (
              <div
                key={index}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_5rem_8rem_auto]"
              >
                <label className="text-xs">
                  Description
                  <input
                    required
                    className={input}
                    value={line.description}
                    onChange={(event) => updateLine(index, { description: event.target.value })}
                  />
                </label>
                <label className="text-xs">
                  Qty
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    className={input}
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(index, { quantity: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="text-xs">
                  Unit price (THB)
                  <input
                    required
                    inputMode="decimal"
                    className={input}
                    value={linePrices[index] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setLinePrices((old) => old.map((price, i) => (i === index ? value : price)))
                      updateLine(index, { unitCents: parseMoney(value) ?? 0 })
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-destructive disabled:opacity-40"
                  disabled={lines.length === 1}
                  onClick={() => {
                    setLines((old) => old.filter((_, i) => i !== index))
                    setLinePrices((old) => old.filter((_, i) => i !== index))
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={secondary}
              onClick={() => {
                setLines((old) => [...old, blankLine()])
                setLinePrices((old) => [...old, ''])
              }}
            >
              Add line
            </button>
            <p className="text-right text-lg font-bold">
              Total: {money(lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0))}
            </p>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" className={primary}>
                Save demo draft
              </button>
              <button type="button" className={secondary} onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(preview)}
        onOpenChange={(next) => {
          if (!next) setPreview(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[760px] overflow-y-auto print:fixed print:inset-0 print:max-h-none print:max-w-none print:translate-none print:overflow-visible print:shadow-none">
          <DialogTitle>Sample invoice preview</DialogTitle>
          <DialogDescription>
            Use your browser to print or save this sample as PDF.
          </DialogDescription>
          {preview && (
            <article className="invoice-print relative space-y-6 bg-white p-6 text-sm text-text-primary print:p-0">
              <span
                className="pointer-events-none absolute inset-0 grid place-items-center text-7xl font-bold tracking-widest text-gray-100 print:text-gray-200"
                aria-hidden="true"
              >
                SAMPLE
              </span>
              <div className="relative">
                <div className="flex justify-between">
                  <strong className="text-2xl">FreelanceFlow</strong>
                  <strong className="text-2xl">INVOICE</strong>
                </div>
                <p className="mt-4">{preview.number}</p>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <p>
                    <strong>Bill to</strong>
                    <br />
                    {preview.client}
                    <br />
                    {preview.project}
                  </p>
                  <p>
                    <strong>Issued</strong> {preview.issueDate}
                    <br />
                    <strong>Due</strong> {preview.dueDate}
                  </p>
                </div>
                <table className="mt-7 w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Description</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((line, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{line.description}</td>
                        <td>{line.quantity}</td>
                        <td>{money(line.unitCents)}</td>
                        <td className="text-right">{money(line.quantity * line.unitCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-5 text-right text-lg font-bold">
                  Total: {money(invoiceTotal(preview))}
                </p>
                <p className="text-right">
                  Balance: {money(invoiceBalance(preview, state.payments))}
                </p>
              </div>
            </article>
          )}
          <button
            type="button"
            className={`${primary} print:hidden`}
            onClick={() => window.print()}
          >
            Print sample
          </button>
        </DialogContent>
      </Dialog>
    </FinanceShell>
  )
}
