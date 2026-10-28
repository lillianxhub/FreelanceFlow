'use client'

import { useState, type ReactNode } from 'react'
import { api } from '../../../api/apiClient'
import { Button } from '../../../components/ui/button'
import { useFeatures } from '../../../Features/FeaturesContext'

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const { features, error, refresh } = useFeatures()
  const [starting, setStarting] = useState(false)
  const [trialError, setTrialError] = useState('')
  async function startTrial() {
    setStarting(true)
    setTrialError('')
    try {
      await api.post('/users/me/premium-trial', {})
      await refresh()
    } catch (reason) {
      setTrialError(reason instanceof Error ? reason.message : 'Could not start trial')
      await refresh()
    } finally {
      setStarting(false)
    }
  }
  if (error)
    return (
      <div role="alert" className="rounded-xl border border-border bg-surface p-6">
        <p>Could not check Finance access.</p>
        <button className="mt-3 text-primary underline" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    )
  if (!features) return <p role="status">Checking Finance access…</p>
  const trial = features.trialAvailable ? (
    <section
      className="mb-6 rounded-xl border border-border bg-surface p-6"
      aria-label="Premium trial"
    >
      <h2 className="text-lg font-semibold">Try Premium free for 7 days</h2>
      <p className="mt-2 text-text-secondary">
        Unlock Finance for 7 days. No automatic charge. Your documents stay saved after the trial.
      </p>
      <Button className="mt-4 min-h-11" disabled={starting} onClick={() => void startTrial()}>
        {starting ? 'Starting trial…' : 'Start 7-day Premium trial'}
      </Button>
      {trialError && (
        <p role="alert" className="mt-2 text-destructive">
          {trialError}
        </p>
      )}
    </section>
  ) : features.trialActive && features.trialEndsAt ? (
    <p role="status" className="mb-6 rounded-xl border border-border bg-surface p-4">
      Premium trial ends{' '}
      {new Date(features.trialEndsAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}{' '}
      (Bangkok).
    </p>
  ) : null
  return (
    <>
      {trial}
      {!features.finance && (
        <div role="status" className="mb-6 rounded-xl border border-border bg-surface p-4">
          {features.trialEndsAt ? 'Your free trial has ended. ' : ''}
          You can still view, search, print, and download existing records. Creating new Finance
          records requires Premium.
        </div>
      )}
      {children}
    </>
  )
}
