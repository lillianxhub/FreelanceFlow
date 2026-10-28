'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../../Authentication/useAuthentication'
import { getErrorMessage } from '../../../api/apiError'
import {
  changeUserPlan,
  changeFeatures,
  getAdminFeatures,
  getAdminSummary,
  getAdminUsers,
  type AdminAccount,
  type AdminSummary,
  type Plan,
  type FeatureSettings,
} from '../../../services/admin'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog'

export default function AdminPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<AdminAccount | null>(null)
  const [saving, setSaving] = useState(false)
  const [features, setFeatures] = useState<FeatureSettings | null>(null)
  const [nextMode, setNextMode] = useState<boolean | null>(null)
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (user?.role !== 'ADMIN') return
    const current = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const [stats, list, flags] = await Promise.all([
        getAdminSummary(),
        getAdminUsers({ search, plan, status, page }),
        getAdminFeatures(),
      ])
      if (current === requestId.current) {
        setSummary(stats)
        setAccounts(list.data)
        setTotal(list.meta?.total ?? 0)
        setFeatures(flags)
      }
    } catch (reason) {
      if (current === requestId.current)
        setError(getErrorMessage(reason, 'Could not load admin dashboard'))
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [user?.role, search, plan, status, page])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const update = async () => {
    if (!selected) return
    const next: Plan = selected.plan === 'FREE' ? 'PREMIUM' : 'FREE'
    setSaving(true)
    try {
      await changeUserPlan(selected, next)
      setSelected(null)
      toast.success('Plan updated')
      await load()
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not update plan; reload and retry'))
      setSelected(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const updateFeatures = async () => {
    if (!features || nextMode === null) return
    setSaving(true)
    try {
      setFeatures(await changeFeatures(features, nextMode))
      toast.success(
        nextMode ? 'Premium access is now required' : 'Finance is open to all active accounts',
      )
    } catch (reason) {
      toast.error(getErrorMessage(reason, 'Could not update access; reload and retry'))
      await load()
    } finally {
      setNextMode(null)
      setSaving(false)
    }
  }

  if (user?.role !== 'ADMIN')
    return (
      <div role="alert" className="rounded-xl border border-border bg-surface p-6">
        You do not have access to the admin dashboard.
      </div>
    )
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-1 text-text-secondary">Accounts and Premium access</p>
      </header>
      {features && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5">
          <div>
            <h2 className="font-semibold">Require Premium for Finance</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {features.premiumEnforced
                ? 'Premium, Admin, and active trials can create Finance records. Existing records remain available.'
                : 'All active accounts can create Finance records. Account plans are preserved.'}
            </p>
          </div>
          <Button
            role="switch"
            aria-checked={features.premiumEnforced}
            aria-label="Require Premium for Finance"
            disabled={loading || saving}
            variant={features.premiumEnforced ? 'default' : 'outline'}
            onClick={() => setNextMode(!features.premiumEnforced)}
          >
            {features.premiumEnforced ? 'On' : 'Off'}
          </Button>
        </section>
      )}
      {loading && <p role="status">Loading accounts…</p>}
      {error && (
        <div role="alert" className="rounded-xl border border-border bg-surface p-5">
          {error}{' '}
          <button className="ml-2 text-primary underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {summary && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ['All accounts', summary.total],
                ['Active Free', summary.activeFree],
                ['Active Premium', summary.activePremium],
                ['New this month', summary.newThisMonth],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-surface p-5">
                <p className="text-sm text-text-secondary">{label}</p>
                <strong className="mt-2 block text-3xl">{value}</strong>
              </div>
            ))}
          </div>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-semibold">Signups in the last six months</h2>
            <div
              className="mt-5 grid grid-cols-6 items-end gap-2"
              role="img"
              aria-label={summary.signups.map((item) => `${item.month}: ${item.count}`).join(', ')}
            >
              {summary.signups.map((item) => (
                <div key={item.month} className="flex flex-col items-center gap-2">
                  <span className="text-xs">{item.count}</span>
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{
                      height: `${Math.max(6, (item.count / Math.max(1, ...summary.signups.map((x) => x.count))) * 100)}px`,
                    }}
                  />
                  <span className="text-xs text-text-secondary">{item.month.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Users</h2>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Search users"
              placeholder="Search name or email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="min-h-10 rounded-lg border border-border px-3"
            />
            <select
              aria-label="Filter plan"
              value={plan}
              onChange={(event) => {
                setPlan(event.target.value)
                setPage(1)
              }}
              className="min-h-10 rounded-lg border border-border px-3"
            >
              <option value="">All plans</option>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </select>
            <select
              aria-label="Filter status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="min-h-10 rounded-lg border border-border px-3"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="py-3">Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-border">
                  <td className="py-3">{account.displayName || '—'}</td>
                  <td>{account.email}</td>
                  <td>
                    {new Date(account.createdAt).toLocaleDateString('en-GB', {
                      timeZone: 'Asia/Bangkok',
                    })}
                  </td>
                  <td>{account.active ? 'Active' : 'Inactive'}</td>
                  <td>{account.role}</td>
                  <td>{account.plan}</td>
                  <td>
                    <Button variant="outline" size="sm" onClick={() => setSelected(account)}>
                      {account.plan === 'FREE' ? 'Enable Premium' : 'Set Free'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && accounts.length === 0 && (
            <p className="py-8 text-center text-text-secondary">No accounts match these filters.</p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {total} accounts · Page {page} of {Math.max(1, Math.ceil(total / 20))}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !saving) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
            <DialogDescription>
              Set {selected?.email} to {selected?.plan === 'FREE' ? 'Premium' : 'Free'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void update()}>
              {saving ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={nextMode !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setNextMode(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nextMode ? 'Require Premium access?' : 'Open Finance to everyone?'}
            </DialogTitle>
            <DialogDescription>
              {nextMode
                ? 'Free accounts without an active trial cannot create new Finance records. Existing records remain available to view, search, print, download, edit, and cancel.'
                : 'All active accounts will be able to use Finance immediately. Existing Free/Premium plans will stay the same.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setNextMode(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void updateFeatures()}>
              {saving ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
