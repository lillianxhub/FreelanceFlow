'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ApiError } from '../api/apiError'
import { getClientById, listClientOptions } from '../services/client'
import { listAllProjects } from '../services/project'
import type { Client } from '../types/client'
import type { Project } from '../types/project'
import {
  financeApi,
  type FinanceLine,
  type FinancePreset,
  type FinanceQuotation,
  type SalesDocumentInput,
} from '../services/finance'
import { FinanceShell, panel, primary, secondary } from './FinanceShell'
import { DocumentPrint } from './DocumentPrint'
import {
  addDays,
  bangkokToday as today,
  formPreview,
  savedPreview,
  type SalesKind,
  type SalesPreview,
} from './documentPreview'
import { blankLine } from './SalesDocumentLineItems'
import { SalesDocumentList, type SalesDocument } from './SalesDocumentList'
import { SalesDocumentEditor } from './SalesDocumentEditor'
import { QuotationConversionDialog } from './QuotationConversionDialog'

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
  const reloadDraft = async () => {
    if (!editing) return
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
      <SalesDocumentList
        kind={kind}
        items={items}
        clients={clients}
        filters={{ search, status, from, to }}
        onFilterChange={(patch) => {
          if (patch.search !== undefined) setSearch(patch.search)
          if (patch.status !== undefined) setStatus(patch.status)
          if (patch.from !== undefined) setFrom(patch.from)
          if (patch.to !== undefined) setTo(patch.to)
          setPage(1)
        }}
        pagination={{ page, total, onPageChange: setPage }}
        state={{ loading, error, editingOpen: open, busy }}
        actions={{
          retry: () => void load(),
          preview: (item) => void showPreview(item),
          edit,
          issue: (item) => void issue(item),
          cancel: (item) => void cancel(item),
          convert: (item) => {
            setConverting(item)
            setConversionIssueDate(today())
            setConversionDueDate(today())
            setConversionError('')
          },
        }}
      />
      <SalesDocumentEditor
        kind={kind}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        clients={clients}
        projects={projects}
        presets={presets}
        values={{ clientId, projectId, issueDate, dueDate, vatRate, discount, note, lines }}
        onLinesChange={setLines}
        onVatRateChange={setVatRate}
        onChange={(patch) => {
          if (patch.clientId !== undefined) setClientId(patch.clientId)
          if (patch.projectId !== undefined) setProjectId(patch.projectId)
          if (patch.issueDate !== undefined) setIssueDate(patch.issueDate)
          if (patch.dueDate !== undefined) setDueDate(patch.dueDate)
          if (patch.vatRate !== undefined) setVatRate(patch.vatRate)
          if (patch.discount !== undefined) setDiscount(patch.discount)
          if (patch.note !== undefined) setNote(patch.note)
        }}
        error={error}
        conflict={conflict}
        busy={busy}
        onSubmit={(event) => void submit(event)}
        onPreview={() => void showPreview()}
        onReload={() => void reloadDraft()}
      />
      <QuotationConversionDialog
        open={Boolean(converting)}
        busy={busy}
        issueDate={conversionIssueDate}
        dueDate={conversionDueDate}
        error={conversionError}
        onClose={() => setConverting(null)}
        onIssueDateChange={setConversionIssueDate}
        onDueDateChange={setConversionDueDate}
        onSubmit={(event) => void convert(event)}
      />
      {preview && <DocumentPrint preview={preview} onClose={() => setPreview(null)} />}
    </FinanceShell>
  )
}
