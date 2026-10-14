'use client'
import Link from 'next/link'
import { useFinance } from './FinanceContext'
import { financeTotals, invoiceBalance, invoiceStatus, money } from './finance'
import { FinanceShell, panel } from './FinanceShell'

export default function Overview() {
  const { state } = useFinance()
  const totals = financeTotals(state)
  const cards = [
    ['Income', totals.income],
    ['Expenses', totals.expenses],
    ['Net', totals.net],
    ['Outstanding', totals.outstanding],
  ] as const
  const months = Array.from(new Set(state.transactions.map((item) => item.date.slice(0, 7)))).sort()
  const max = Math.max(
    1,
    ...months.map((month) =>
      state.transactions
        .filter((item) => item.kind === 'income' && item.date.startsWith(month))
        .reduce((sum, item) => sum + item.amountCents, 0),
    ),
  )
  return (
    <FinanceShell
      title="Financial overview"
      description="A snapshot of your sample income, expenses, and invoices."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value], index) => (
          <div
            key={label}
            className={`${panel} border-t-[3px] ${['border-t-primary', 'border-t-orange', 'border-t-green', 'border-t-violet'][index]}`}
          >
            <p className="text-sm text-text-secondary">{label}</p>
            <strong className="mt-4 block text-2xl tabular-nums">{money(value)}</strong>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className={panel}>
          <h2 className="font-semibold">Income by month</h2>
          <p className="text-sm text-text-secondary">Based on sample transactions</p>
          {months.length ? (
            <div className="mt-7 space-y-4">
              {months.map((month) => {
                const amount = state.transactions
                  .filter((item) => item.kind === 'income' && item.date.startsWith(month))
                  .reduce((sum, item) => sum + item.amountCents, 0)
                return (
                  <div
                    key={month}
                    className="grid grid-cols-[6rem_1fr_7rem] items-center gap-3 text-sm"
                  >
                    <span>{month}</span>
                    <div className="h-6 rounded bg-primary-soft">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${(amount / max) * 100}%` }}
                      />
                    </div>
                    <strong className="text-right">{money(amount)}</strong>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-text-secondary">No income to chart yet.</p>
          )}
        </section>
        <section className={panel}>
          <h2 className="font-semibold">Invoices to collect</h2>
          <div className="mt-4 space-y-3">
            {state.invoices
              .filter(
                (item) =>
                  invoiceBalance(item, state.payments) > 0 &&
                  invoiceStatus(item, state.payments) !== 'DRAFT',
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 border-b border-border pb-3 text-sm"
                >
                  <span>
                    {item.number}
                    <small className="block text-text-secondary">{item.client}</small>
                  </span>
                  <strong>{money(invoiceBalance(item, state.payments))}</strong>
                </div>
              ))}
          </div>
          <Link
            href="/finance/payments"
            className="mt-5 inline-block text-sm font-semibold text-primary"
          >
            View payments →
          </Link>
        </section>
      </div>
    </FinanceShell>
  )
}
