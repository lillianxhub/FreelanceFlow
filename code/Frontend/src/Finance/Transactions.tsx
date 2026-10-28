'use client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { financeApi, formatBaht, type FinanceTransaction } from '../services/finance'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'
import { listAllProjects } from '../services/project'
import type { Project } from '../types/project'

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export default function Transactions({ kind }: { kind: 'income' | 'expense' }) {
  const [items, setItems] = useState<FinanceTransaction[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceTransaction | null>(null)
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [projectId, setProjectId] = useState('')
  const loadRevision = useRef(0)
  const load = useCallback(async () => {
    const revision = ++loadRevision.current
    setLoading(true)
    setError('')
    try {
      const result = await financeApi.transactions({
        kind: kind.toUpperCase(),
        search,
        page,
        limit: 20,
      })
      if (revision !== loadRevision.current) return
      setItems(result.items)
      setTotal(result.total)
    } catch (reason) {
      if (revision !== loadRevision.current) return
      setError(reason instanceof Error ? reason.message : 'Could not load transactions')
    } finally {
      if (revision === loadRevision.current) setLoading(false)
    }
  }, [kind, page, search])
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
    void listAllProjects()
      .then(setProjects)
      .catch(() => {})
  }, [])
  const edit = (item?: FinanceTransaction) => {
    setEditing(item ?? null)
    setDate(item?.date ?? today())
    setDescription(item?.description ?? '')
    setCategory(item?.category ?? '')
    setAmount(item?.amount ?? '')
    setProjectId(item?.projectId ?? '')
    setError('')
    setOpen(true)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await financeApi.saveTransaction(
        {
          kind: kind.toUpperCase() as FinanceTransaction['kind'],
          date,
          description,
          category,
          amount,
          projectId: projectId || null,
          version: editing?.version,
        },
        editing?.id,
      )
      toast.success('Transaction saved')
      setOpen(false)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save transaction')
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (item: FinanceTransaction) => {
    const reason = window.prompt('Reason for cancellation')
    if (!reason?.trim()) return
    setBusy(true)
    try {
      await financeApi.cancelTransaction(item, reason)
      toast.success('Transaction cancelled')
      await load()
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Could not cancel transaction')
      await load()
    } finally {
      setBusy(false)
    }
  }
  const title = kind === 'income' ? 'Income' : 'Expenses'
  return (
    <FinanceShell
      title={title}
      description={`Recorded ${kind} in Thai baht. Cancelled entries stay in history.`}
    >
      <div className="flex justify-end">
        <button className={primary} onClick={() => edit()}>
          Add {kind}
        </button>
      </div>
      <section className={panel}>
        <input
          aria-label={`Search ${title}`}
          className={`${input} mb-4 max-w-sm`}
          placeholder="Search description"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
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
          <p className="py-8 text-center text-text-secondary">No transactions yet.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="py-3">{item.date}</td>
                  <td>
                    {item.description}
                    {item.paymentId && <small className="block">Invoice payment</small>}
                    {item.cancelled && <small className="block text-destructive">Cancelled</small>}
                  </td>
                  <td>{item.category}</td>
                  <td className="tabular-nums">{formatBaht(item.amount)}</td>
                  <td>
                    {!item.cancelled && !item.paymentId && (
                      <>
                        <button className="mr-2 text-primary" onClick={() => edit(item)}>
                          Edit
                        </button>
                        <button
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => void cancel(item)}
                        >
                          Cancel
                        </button>
                      </>
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
          <SheetTitle>
            {editing ? 'Edit' : 'Add'} {kind}
          </SheetTitle>
          <SheetDescription>Money already received or spent.</SheetDescription>
          <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
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
              Description
              <input
                className={input}
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Category
              <input
                className={input}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Project (optional)
              <select
                className={input}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Amount (THB)
              <input
                className={input}
                type="text"
                inputMode="decimal"
                pattern={'[0-9]+(\\.[0-9]{1,2})?'}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <button className={primary} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </FinanceShell>
  )
}
