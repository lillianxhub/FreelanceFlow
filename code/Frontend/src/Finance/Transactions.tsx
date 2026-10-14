'use client'
import { useState, type FormEvent } from 'react'
import { useFinance } from './FinanceContext'
import { money, parseMoney, type Transaction, type TransactionKind } from './finance'
import { FinanceShell, input, panel, primary, secondary } from './FinanceShell'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/ui/sheet'

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
export default function Transactions({ kind }: { kind: TransactionKind }) {
  const { state, saveTransaction, deleteTransaction } = useFinance()
  const title = kind === 'income' ? 'Income' : 'Expenses'
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [project, setProject] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState('')
  const items = state.transactions.filter((item) => item.kind === kind)
  const categories = Array.from(new Set(items.map((item) => item.category)))
  const visible = items
    .filter(
      (item) =>
        (!categoryFilter || item.category === categoryFilter) &&
        `${item.description} ${item.project} ${item.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const edit = (item?: Transaction) => {
    setEditing(item ?? null)
    setDescription(item?.description ?? '')
    setAmount(item ? (item.amountCents / 100).toFixed(2) : '')
    setCategory(item?.category ?? '')
    setProject(item?.project ?? '')
    setDate(item?.date ?? today())
    setError('')
    setOpen(true)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cents = parseMoney(amount)
    if (!description.trim() || !category.trim() || !project.trim() || !date || cents === null) {
      setError('Complete every field and enter a valid amount above zero.')
      return
    }
    saveTransaction({
      id: editing?.id ?? crypto.randomUUID(),
      kind,
      description: description.trim(),
      category: category.trim(),
      project: project.trim(),
      date,
      amountCents: cents,
    })
    setOpen(false)
  }
  return (
    <FinanceShell title={title} description={`Track sample ${kind} across your projects.`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-lg">
          Total {title.toLowerCase()}:{' '}
          {money(items.reduce((sum, item) => sum + item.amountCents, 0))}
        </strong>
        <button type="button" className={primary} onClick={() => edit()}>
          Add {kind}
        </button>
      </div>
      <section className={panel}>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <input
            className={input}
            aria-label={`Search ${title.toLowerCase()}`}
            placeholder="Search description or project"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={input}
            aria-label="Filter category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-border text-text-secondary">
              <tr>
                <th className="py-3">Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Project</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-4">{item.date}</td>
                  <td className="font-medium">{item.description}</td>
                  <td>{item.category}</td>
                  <td>{item.project}</td>
                  <td className="text-right tabular-nums">{money(item.amountCents)}</td>
                  <td className="text-right">
                    {item.paymentId ? (
                      <span className="text-xs text-text-secondary">Managed in Payments</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          className="px-2 text-primary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this sample entry?'))
                              deleteTransaction(item.id)
                          }}
                          className="px-2 text-destructive"
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
            <p className="py-10 text-center text-text-secondary">No entries match your filters.</p>
          )}
        </div>
      </section>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full max-w-none overflow-y-auto p-6 sm:max-w-md">
          <SheetTitle>{editing ? `Edit ${kind}` : `Add ${kind}`}</SheetTitle>
          <SheetDescription>Sample data only. Changes reset on reload.</SheetDescription>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {[
              ['Description', description, setDescription],
              ['Category', category, setCategory],
              ['Project', project, setProject],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block space-y-1 text-sm font-medium">
                {label as string}
                <input
                  required
                  className={input}
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                />
              </label>
            ))}
            <label className="block space-y-1 text-sm font-medium">
              Date
              <input
                required
                type="date"
                className={input}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              Amount (THB)
              <input
                required
                inputMode="decimal"
                className={input}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" className={primary}>
                Save sample entry
              </button>
              <button type="button" className={secondary} onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </FinanceShell>
  )
}
