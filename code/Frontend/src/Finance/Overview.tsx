'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { FinanceShell, panel, secondary } from './FinanceShell'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/ui/chart'
import { decimalCents, financeApi, formatBaht, type FinanceSummary } from '../services/finance'

const compactBaht = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const monthFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: '2-digit',
  timeZone: 'Asia/Bangkok',
})

function chartValue(value: string) {
  const cents = decimalCents(value)
  return cents === null ? 0 : Number(cents) / 100
}

function monthLabel(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value
  return monthFormatter.format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)))
}

function formatChartBaht(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(amount) ? formatBaht(amount.toFixed(2)) : '—'
}

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
  const cashFlow = (summary?.cashByMonth ?? []).map((month) => {
    const income = chartValue(month.income)
    const expenses = chartValue(month.expenses)
    return {
      month: monthLabel(month.month),
      income,
      expenses,
      net: income - expenses,
    }
  })
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
        <section className={`${panel} min-w-0`} aria-labelledby="cash-flow-title">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="cash-flow-title" className="font-semibold">
                Monthly cash flow
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Income, expenses, and net cash for the last six months.
              </p>
            </div>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-text-secondary">
              THB
            </span>
          </div>
          {cashFlow.length ? (
            <ChartContainer
              className="mt-5 h-[320px] w-full min-w-0 aspect-auto"
              aria-label="Monthly cash flow chart comparing income, expenses, and net cash"
              config={{
                income: { label: 'Income', color: 'var(--green)' },
                expenses: { label: 'Expenses', color: 'var(--orange)' },
                net: { label: 'Net cash', color: 'var(--primary)' },
              }}
            >
              <ComposedChart
                accessibilityLayer
                data={cashFlow}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={12}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `฿${compactBaht.format(Number(value))}`}
                  width={64}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--surface-soft)' }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatChartBaht(value)}
                      indicator="dot"
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="var(--color-net)"
                  strokeWidth={3}
                  dot={{ r: 3, fill: 'var(--color-net)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <p className="py-12 text-center text-sm text-text-secondary">
              No cash flow data is available yet.
            </p>
          )}
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
