'use client'

import type { ReactNode } from 'react'
import { useFeatures } from '../../../Features/FeaturesContext'

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const { features, error, refresh } = useFeatures()
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-border bg-white p-6">
        <p>Could not check Finance access.</p>
        <button className="mt-3 text-primary underline" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    )
  if (!features) return <p role="status">Checking Finance access…</p>
  if (!features.finance)
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <h1 className="text-2xl font-bold">Finance requires Premium</h1>
        <p className="mt-2 text-text-secondary">
          Contact an admin to enable Premium for your account.
        </p>
      </div>
    )
  return <>{children}</>
}
