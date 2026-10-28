'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const links = [
  ['/finance', 'Overview'],
  ['/finance/income', 'Income'],
  ['/finance/expenses', 'Expenses'],
  ['/finance/quotations', 'Quotations'],
  ['/finance/invoices', 'Invoices'],
  ['/finance/payments', 'Payments'],
  ['/finance/tax-invoices', 'Tax invoices'],
  ['/finance/settings', 'Settings & templates'],
]
export function FinanceShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const pathname = usePathname()
  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Finance</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </header>
      <nav aria-label="Finance pages" className="flex gap-1 overflow-x-auto border-b border-border">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className={`min-h-11 shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${pathname === href ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-primary'}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
export const panel = 'rounded-xl border border-border bg-surface p-5 shadow-sm'
export const input =
  'min-h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-primary'
export const primary =
  'min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-50'
export const secondary =
  'min-h-10 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-soft disabled:opacity-50'
