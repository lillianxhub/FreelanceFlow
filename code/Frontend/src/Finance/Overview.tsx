'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FinanceShell, panel, secondary } from './FinanceShell'
import { decimalCents, financeApi, formatBaht, type FinanceSummary } from '../services/finance'

export default function Overview() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setSummary(await financeApi.summary())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load Finance')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    queueMicrotask(() => void load())
  }, [])
  const cards = summary
    ? [
        ['Cash received', summary.income],
        ['Cash spent', summary.expenses],
        ['Net cash', summary.net],
        ['Outstanding invoices', summary.outstanding],
        ['Invoice VAT', summary.vat],
        ['Withheld tax', summary.withheld],
      ]
    : []
  return (
    <FinanceShell
      title="Financial overview"
      description="Your recorded cash flow and outstanding invoices in Thai baht."
    >
      {loading && <p role="status">Loading Finance summary…</p>}
      {error && (
        <div role="alert" className={panel}>
          {error}
          <button className={`${secondary} ml-3`} onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value]) => (
            <div className={panel} key={label}>
              <p className="text-sm text-text-secondary">{label}</p>
              <strong className="mt-3 block text-2xl tabular-nums">{formatBaht(value)}</strong>
            </div>
          ))}
        </div>
      )}
      {summary && (
        <section className={panel}>
          <h2 className="font-semibold">Cash received by month</h2>
          <div className="mt-4 space-y-3">
            {summary.cashByMonth.map((month) => {
              const amount = decimalCents(month.income) ?? 0n
              const max = summary.cashByMonth.reduce((largest, item) => {
                const value = decimalCents(item.income) ?? 0n
                return value > largest ? value : largest
              }, 1n)
              return (
                <div
                  key={month.month}
                  className="grid grid-cols-[5rem_1fr_8rem] items-center gap-3 text-sm"
                >
                  <span>{month.month}</span>
                  <div className="h-5 rounded bg-primary-soft">
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${Number((amount * 100n) / max)}%` }}
                    />
                  </div>
                  <strong className="text-right tabular-nums">{formatBaht(month.income)}</strong>
                </div>
              )
            })}
          </div>
        </section>
      )}
      <div className="flex flex-wrap gap-3">
        <Link className="text-primary underline" href="/finance/invoices">
          Manage invoices
        </Link>
        <Link className="text-primary underline" href="/finance/settings">
          Business settings and templates
        </Link>
      </div>
    </FinanceShell>
  )
}
