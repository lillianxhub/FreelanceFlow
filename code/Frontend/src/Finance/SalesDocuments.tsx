'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ApiError } from '../api/apiError'
import { getClientById, listClientOptions } from '../services/client'
import { listAllProjects } from '../services/project'
import type { Client } from '../types/client'
import type { Project } from '../types/project'
import {
  financeApi,
  formatBaht,
  type FinanceInvoice,
  type FinanceLine,
  type FinancePreset,
  type FinanceQuotation,
  type SalesDocumentInput,
} from '../services/finance'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'
import { DocumentPrint } from './DocumentPrint'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog'
import {
  addDays,
  bangkokToday as today,
  formPreview,
  savedPreview,
  type SalesKind,
  type SalesPreview,
} from './documentPreview'

const blankLine = (): FinanceLine => ({
  description: '',
  quantity: '1',
  unit: '',
  unitPrice: '0.00',
})
type SalesDocument = FinanceInvoice | FinanceQuotation
export default function SalesDocuments({ kind }: { kind: SalesKind }) {
  const quotation = kind === 'QUOTATION'
  const singular = quotation ? 'quotation' : 'invoice'
  const title = quotation ? 'Quotations' : 'Invoices'
  const router = useRouter()
  const [converting, setConverting] = useState<FinanceQuotation | null>(null)
  const [conversionIssueDate, setConversionIssueDate] = useState(today)
  const [conversionDueDate, setConversionDueDate] = useState(today)
  const [conversionError, setConversionError] = useState('')
  const [supportError, setSupportError] = useState('')
  const [items, setItems] = useState<SalesDocument[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [presets, setPresets] = useState<FinancePreset[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SalesDocument | null>(null)
  const [preview, setPreview] = useState<SalesPreview | null>(null)
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)
  const [vatRate, setVatRate] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<FinanceLine[]>([blankLine()])
  const loadRevision = useRef(0)
  const load = useCallback(async () => {
    const revision = ++loadRevision.current
    setLoading(true)
    setError('')
    try {
      const result = await (quotation ? financeApi.quotations : financeApi.invoices)({
        search,
        status,
        from,
        to,
        page,
        limit: 20,
      })
      if (revision !== loadRevision.current) return
      setItems(result.items)
      setTotal(result.total)
    } catch (reason) {
      if (revision !== loadRevision.current) return
      setError(reason instanceof Error ? reason.message : 'Could not load invoices')
    } finally {
      if (revision === loadRevision.current) setLoading(false)
    }
  }, [page, search, status, from, to, quotation])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void load()
    })
    return () => {
      active = false
    }
  }, [load])
  const loadOptions = useCallback(async () => {
    setSupportError('')
    try {
      const [c, p, t] = await Promise.all([
        listClientOptions(),
        listAllProjects(),
        financeApi.presets(),
      ])
      setClients(c)
      setProjects(p)
      setPresets(t)
    } catch (reason) {
      setSupportError(reason instanceof Error ? reason.message : 'Could not load form options')
    }
  }, [])
  useEffect(() => {
    void Promise.resolve().then(loadOptions)
  }, [loadOptions])
  const edit = useCallback(
    (item?: SalesDocument) => {
      setEditing(item ?? null)
      setClientId(item?.clientId ?? '')
      setProjectId(item?.projectId ?? '')
      setIssueDate(item?.issueDate ?? today())
      setDueDate(
        item
          ? 'validUntil' in item
            ? item.validUntil
            : item.dueDate
          : quotation
            ? addDays(today(), 30)
            : today(),
      )
      setVatRate(item?.vatRate ?? '0')
      setDiscount(item?.discount ?? '0')
      setNote(item?.note ?? '')
      setLines(item?.lines ?? [blankLine()])
      setError('')
      setConflict(false)
      setOpen(true)
    },
    [quotation],
  )
  useEffect(() => {
    if (quotation) return
    const id = new URLSearchParams(window.location.search).get('invoice')
    if (!id) return
    let active = true
    void financeApi
      .invoice(id)
      .then((item) => {
        if (!active) return
        if (item.status === 'DRAFT') edit(item)
        else setPreview(savedPreview(item, 'INVOICE', null))
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load invoice')
      })
    return () => {
      active = false
    }
  }, [quotation, edit])
  useEffect(() => {
    if (!clientId || clients.some((client) => client.id === clientId)) return
    let active = true
    void getClientById(clientId)
      .then((client) => {
        if (active)
          setClients((current) =>
            current.some((item) => item.id === client.id) ? current : [...current, client],
          )
      })
      .catch(() => {
        if (active) setSupportError('Could not load the selected client. Please retry.')
      })
    return () => {
      active = false
    }
  }, [clientId, clients])
  const formInput = (): SalesDocumentInput => ({
    clientId,
    projectId: projectId || null,
    issueDate,
    ...(quotation ? { validUntil: dueDate } : { dueDate }),
    vatRate,
    discount,
    note,
    lines,
    version: editing?.version,
  })
  const showPreview = async (item?: SalesDocument) => {
    setBusy(true)
    try {
      if (item && item.status !== 'DRAFT') {
        setPreview(savedPreview(item, kind, null))
        return
      }
      const selectedClientId = item?.clientId ?? clientId
      const [settings, client] = await Promise.all([
        financeApi.settings(),
        selectedClientId ? getClientById(selectedClientId) : Promise.resolve(undefined),
      ])
      setPreview(
        item
          ? savedPreview(item, kind, settings, client)
          : formPreview(kind, formInput(), settings, client),
      )
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not prepare preview')
    } finally {
      setBusy(false)
    }
  }
  const convert = async (event: FormEvent) => {
    event.preventDefault()
    if (!converting) return
    setBusy(true)
    setConversionError('')
    try {
      const invoice = await financeApi.quotationInvoice(
        converting,
        conversionIssueDate,
        conversionDueDate,
      )
      setConverting(null)
      router.push(`/finance/invoices?invoice=${invoice.id}`)
    } catch (reason) {
      setConversionError(reason instanceof Error ? reason.message : 'Could not create invoice')
      await load()
    } finally {
      setBusy(false)
    }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const values = formInput()
      if (quotation) await financeApi.saveQuotation(values, editing?.id)
      else await financeApi.saveInvoice(values, editing?.id)
      toast.success('Draft saved')
      setOpen(false)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save document')
      if (reason instanceof ApiError && reason.status === 409) {
        setConflict(true)
        await load()
        setError('This draft changed. Reload the latest document before saving again.')
      }
    } finally {
      setBusy(false)
    }
  }
  const issue = async (item: SalesDocument) => {
    if (!window.confirm(`Issue this ${singular}? Issued documents cannot be edited.`)) return
    setBusy(true)
    try {
      if ('validUntil' in item) await financeApi.issueQuotation(item)
      else await financeApi.issueInvoice(item)
      toast.success(`${quotation ? 'Quotation' : 'Invoice'} issued`)
      await load()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'Could not issue invoice')
      await load()
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (item: SalesDocument) => {
    const reason = window.prompt('Reason for cancellation')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      if ('validUntil' in item) await financeApi.cancelQuotation(item, reason)
      else await financeApi.cancelInvoice(item, reason)
      toast.success('Document cancelled')
      await load()
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Could not cancel invoice')
      await load()
    } finally {
      setBusy(false)
    }
  }
  return (
    <FinanceShell
      title={title}
      description={
        quotation
          ? 'Prepare quotations, preview your offer and create an invoice when ready.'
          : 'Create drafts, issue invoices and track paid balances.'
      }
    >
      <div className="flex justify-end">
        <button className={primary} onClick={() => edit()}>
          New {singular}
        </button>
      </div>
      {supportError && (
        <div role="alert" className={panel}>
          {supportError}{' '}
          <button className={secondary} onClick={() => void loadOptions()}>
            Retry form options
          </button>
        </div>
      )}
      <section className={panel}>
        <input
          className={`${input} mb-4 max-w-sm`}
          aria-label={`Search ${title.toLowerCase()}`}
          placeholder="Search number or client"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <select
            aria-label={`${quotation ? 'Quotation' : 'Invoice'} status`}
            className={input}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
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
          <p className="py-8 text-center text-text-secondary">No {title.toLowerCase()} yet.</p>
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
                  <td>{clients.find((c) => c.id === item.clientId)?.name ?? item.clientId}</td>
                  <td>{'validUntil' in item ? item.validUntil : item.dueDate}</td>
                  <td>{item.status}</td>
                  <td>{formatBaht(item.total)}</td>
                  {'paid' in item && <td>{formatBaht(item.paid)}</td>}
                  <td className="space-x-2">
                    <button
                      className="text-primary"
                      disabled={busy}
                      onClick={() => void showPreview(item)}
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
                        disabled={busy}
                        onClick={() => {
                          setConverting(item)
                          setConversionIssueDate(today())
                          setConversionDueDate(today())
                          setConversionError('')
                        }}
                      >
                        Create invoice
                      </button>
                    )}
                    {item.status === 'DRAFT' && (
                      <>
                        <button className="text-primary" onClick={() => edit(item)}>
                          Edit
                        </button>
                        <button
                          className="text-primary"
                          disabled={busy}
                          onClick={() => void issue(item)}
                        >
                          Issue
                        </button>
                      </>
                    )}
                    {item.status !== 'CANCELLED' && (
                      <button
                        className="text-red-600"
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
        <SheetContent
          aria-label={editing ? 'Edit draft' : `New ${singular}`}
          className="w-full overflow-y-auto p-6 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetTitle>{editing ? 'Edit draft' : `New ${singular}`}</SheetTitle>
          <SheetDescription>
            Prices exclude VAT. Amounts are confirmed by the server.
          </SheetDescription>
          <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm">
              Client
              <select
                className={input}
                required
                aria-label="Client"
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value)
                  setProjectId('')
                }}
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Project (optional)
              <select
                className={input}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">No project</option>
                {projects
                  .filter((p) => p.client_id === clientId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                Issue date
                <input
                  className={input}
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                {quotation ? 'Valid until' : 'Due date'}
                <input
                  className={input}
                  type="date"
                  value={dueDate}
                  min={issueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="block text-sm">
              Add service preset
              <select
                className={input}
                value=""
                onChange={(event) => {
                  const preset = presets.find((p) => p.id === event.target.value)
                  if (preset) {
                    setLines((old) => [
                      ...old,
                      {
                        description: preset.description,
                        quantity: preset.quantity,
                        unit: preset.unit,
                        unitPrice: preset.unitPrice,
                      },
                    ])
                    setVatRate(preset.suggestedVatRate)
                  }
                }}
              >
                <option value="">Choose preset</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {lines.map((line, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                <label className="block text-sm">
                  Description
                  <input
                    className={input}
                    required
                    value={line.description}
                    onChange={(event) =>
                      setLines((old) =>
                        old.map((l, i) =>
                          i === index ? { ...l, description: event.target.value } : l,
                        ),
                      )
                    }
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-sm">
                    Quantity
                    <input
                      className={input}
                      required
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) =>
                        setLines((old) =>
                          old.map((l, i) =>
                            i === index ? { ...l, quantity: event.target.value } : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Unit
                    <input
                      className={input}
                      value={line.unit}
                      onChange={(event) =>
                        setLines((old) =>
                          old.map((l, i) => (i === index ? { ...l, unit: event.target.value } : l)),
                        )
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Price
                    <input
                      className={input}
                      required
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(event) =>
                        setLines((old) =>
                          old.map((l, i) =>
                            i === index ? { ...l, unitPrice: event.target.value } : l,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="min-h-11 text-red-600"
                    onClick={() => setLines((old) => old.filter((_, i) => i !== index))}
                  >
                    Remove line
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={secondary}
              disabled={lines.length >= 100}
              onClick={() => setLines((old) => [...old, blankLine()])}
            >
              Add line
            </button>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Discount THB
                <input
                  className={input}
                  inputMode="decimal"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </label>
              <label className="text-sm">
                VAT %
                <input
                  className={input}
                  inputMode="decimal"
                  value={vatRate}
                  onChange={(event) => setVatRate(event.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              Note
              <textarea
                className={input}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            {conflict && editing && (
              <button
                type="button"
                className={secondary}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const latest = quotation
                      ? await financeApi.quotation(editing.id)
                      : await financeApi.invoice(editing.id)
                    if (latest.status === 'DRAFT') edit(latest)
                    else {
                      setOpen(false)
                      await showPreview(latest)
                    }
                  } catch (reason) {
                    setError(reason instanceof Error ? reason.message : 'Could not reload draft')
                  } finally {
                    setBusy(false)
                  }
                }}
                disabled={busy}
              >
                Reload draft (replace local edits)
              </button>
            )}
            <button
              type="button"
              className={`${secondary} mr-2`}
              disabled={busy}
              onClick={() => void showPreview()}
            >
              Preview
            </button>
            <button className={primary} disabled={busy || conflict}>
              {busy ? 'Saving…' : 'Save draft'}
            </button>
          </form>
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(converting)}
        onOpenChange={(open) => {
          if (!open && !busy) setConverting(null)
        }}
      >
        <DialogContent>
          <DialogTitle>Create invoice from quotation</DialogTitle>
          <DialogDescription>
            Copy the quotation into an editable invoice draft. Choose the invoice dates.
          </DialogDescription>
          <form onSubmit={(event) => void convert(event)} className="space-y-4">
            <label className="block">
              Invoice issue date
              <input
                required
                type="date"
                className={input}
                value={conversionIssueDate}
                onChange={(event) => setConversionIssueDate(event.target.value)}
              />
            </label>
            <label className="block">
              Invoice due date
              <input
                required
                type="date"
                min={conversionIssueDate}
                className={input}
                value={conversionDueDate}
                onChange={(event) => setConversionDueDate(event.target.value)}
              />
            </label>
            {conversionError && <p role="alert">{conversionError}</p>}
            <button className={primary} disabled={busy}>
              {busy ? 'Creating…' : 'Create draft'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      {preview && <DocumentPrint preview={preview} onClose={() => setPreview(null)} />}
    </FinanceShell>
  )
}
