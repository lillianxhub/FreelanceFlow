'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '../Authentication/useAuthentication'
import { api } from '../api/apiClient'

export interface Features {
  plan: 'FREE' | 'PREMIUM'
  finance: boolean
  premiumEnforced: boolean
  trialActive: boolean
  trialEndsAt: string | null
  trialAvailable: boolean
}
const FeaturesContext = createContext<{
  features: Features | null
  error: string
  refresh: () => Promise<void>
} | null>(null)

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [state, setState] = useState<{ owner: string; features: Features } | null>(null)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const invalidate = useCallback(() => {
    revision.current++
  }, [])
  const refresh = useCallback(async () => {
    const current = ++revision.current
    if (!user) return
    try {
      const response = await api.get<Features>('/users/me/features', { cache: 'no-store' })
      if (current === revision.current) {
        setState({ owner: user.id, features: response.data })
        setError('')
      }
    } catch (reason) {
      if (current === revision.current) {
        setState(null)
        setError(reason instanceof Error ? reason.message : 'Could not check access')
      }
    }
  }, [user])
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) void refresh()
    })
    return () => {
      active = false
      invalidate()
    }
  }, [refresh, pathname, invalidate])
  useEffect(() => {
    const revoked = () => {
      revision.current++
      setState((previous) =>
        previous ? { ...previous, features: { ...previous.features, finance: false } } : null,
      )
      void refresh()
    }
    const changed = () => {
      void refresh()
    }
    window.addEventListener('focus', changed)
    window.addEventListener('freelanceflow-features-changed', changed)
    window.addEventListener('freelanceflow-finance-revoked', revoked)
    return () => {
      window.removeEventListener('focus', changed)
      window.removeEventListener('freelanceflow-features-changed', changed)
      window.removeEventListener('freelanceflow-finance-revoked', revoked)
    }
  }, [refresh])
  const trialEndsAt = state?.owner === user?.id ? state?.features.trialEndsAt : null
  useEffect(() => {
    if (!trialEndsAt) return
    const delay = new Date(trialEndsAt).getTime() - Date.now()
    if (delay <= 0) return
    const timer = window.setTimeout(() => void refresh(), Math.min(delay + 100, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [trialEndsAt, refresh])
  return (
    <FeaturesContext.Provider
      value={{
        features: state?.owner === user?.id ? (state?.features ?? null) : null,
        error,
        refresh,
      }}
    >
      {children}
    </FeaturesContext.Provider>
  )
}

export function useFeatures() {
  const value = useContext(FeaturesContext)
  if (!value) throw new Error('FeaturesProvider is required')
  return value
}
