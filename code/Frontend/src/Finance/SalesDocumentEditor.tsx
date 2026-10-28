import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Client } from '../types/client'
import type { Project } from '../types/project'
import type { FinanceLine, FinancePreset } from '../services/finance'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'
import { input, primary, secondary } from './FinanceShell'
import { SalesDocumentLineItems } from './SalesDocumentLineItems'
import type { SalesDocument } from './SalesDocumentList'
import type { SalesKind } from './documentPreview'

type Values = {
  clientId: string
  projectId: string
  issueDate: string
  dueDate: string
  vatRate: string
  discount: string
  note: string
  lines: FinanceLine[]
}

type Props = {
  kind: SalesKind
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: SalesDocument | null
  clients: Client[]
  projects: Project[]
  presets: FinancePreset[]
  values: Values
  onChange: (patch: Partial<Omit<Values, 'lines'>>) => void
  onLinesChange: Dispatch<SetStateAction<FinanceLine[]>>
  onVatRateChange: Dispatch<SetStateAction<string>>
  error: string
  conflict: boolean
  busy: boolean
  onSubmit: (event: FormEvent) => void
  onPreview: () => void
  onReload: () => void
}

export function SalesDocumentEditor({
  kind,
  open,
  onOpenChange,
  editing,
  clients,
  projects,
  presets,
  values,
  onChange,
  onLinesChange,
  onVatRateChange,
  error,
  conflict,
  busy,
  onSubmit,
  onPreview,
  onReload,
}: Props) {
  const singular = kind === 'QUOTATION' ? 'quotation' : 'invoice'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-label={editing ? 'Edit draft' : `New ${singular}`}
        className="w-full overflow-y-auto p-6 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetTitle>{editing ? 'Edit draft' : `New ${singular}`}</SheetTitle>
        <SheetDescription>
          Prices exclude VAT. Amounts are confirmed by the server.
        </SheetDescription>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            Client
            <select
              className={input}
              required
              aria-label="Client"
              value={values.clientId}
              onChange={(event) => onChange({ clientId: event.target.value, projectId: '' })}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Project (optional)
            <select
              className={input}
              value={values.projectId}
              onChange={(event) => onChange({ projectId: event.target.value })}
            >
              <option value="">No project</option>
              {projects
                .filter((project) => project.client_id === values.clientId)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
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
                value={values.issueDate}
                onChange={(event) => onChange({ issueDate: event.target.value })}
                required
              />
            </label>
            <label className="block text-sm">
              {kind === 'QUOTATION' ? 'Valid until' : 'Due date'}
              <input
                className={input}
                type="date"
                value={values.dueDate}
                min={values.issueDate}
                onChange={(event) => onChange({ dueDate: event.target.value })}
                required
              />
            </label>
          </div>
          <SalesDocumentLineItems
            lines={values.lines}
            presets={presets}
            setLines={onLinesChange}
            setVatRate={onVatRateChange}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Discount THB
              <input
                className={input}
                inputMode="decimal"
                value={values.discount}
                onChange={(event) => onChange({ discount: event.target.value })}
              />
            </label>
            <label className="text-sm">
              VAT %
              <input
                className={input}
                inputMode="decimal"
                value={values.vatRate}
                onChange={(event) => onChange({ vatRate: event.target.value })}
              />
            </label>
          </div>
          <label className="block text-sm">
            Note
            <textarea
              className={input}
              value={values.note}
              onChange={(event) => onChange({ note: event.target.value })}
            />
          </label>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {conflict && editing && (
            <button type="button" className={secondary} onClick={onReload} disabled={busy}>
              Reload draft (replace local edits)
            </button>
          )}
          <button type="button" className={`${secondary} mr-2`} disabled={busy} onClick={onPreview}>
            Preview
          </button>
          <button className={primary} disabled={busy || conflict}>
            {busy ? 'Saving…' : 'Save draft'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
