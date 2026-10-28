import type { FormEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { input, primary } from './FinanceShell'

type Props = {
  open: boolean
  busy: boolean
  issueDate: string
  dueDate: string
  error: string
  onClose: () => void
  onIssueDateChange: (value: string) => void
  onDueDateChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function QuotationConversionDialog({
  open,
  busy,
  issueDate,
  dueDate,
  error,
  onClose,
  onIssueDateChange,
  onDueDateChange,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !busy && onClose()}>
      <DialogContent>
        <DialogTitle>Create invoice from quotation</DialogTitle>
        <DialogDescription>
          Copy the quotation into an editable invoice draft. Choose the invoice dates.
        </DialogDescription>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            Invoice issue date
            <input
              required
              type="date"
              className={input}
              value={issueDate}
              onChange={(event) => onIssueDateChange(event.target.value)}
            />
          </label>
          <label className="block">
            Invoice due date
            <input
              required
              type="date"
              min={issueDate}
              className={input}
              value={dueDate}
              onChange={(event) => onDueDateChange(event.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className={primary} disabled={busy}>
            {busy ? 'Creating…' : 'Create draft'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
