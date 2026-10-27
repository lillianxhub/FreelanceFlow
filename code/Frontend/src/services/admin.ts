import { api } from '../api/apiClient'

export type Plan = 'FREE' | 'PREMIUM'
export interface FeatureSettings {
  premiumEnforced: boolean
  version: number
}
export async function getAdminFeatures() {
  return (await api.get<FeatureSettings>('/admin/features')).data
}
export async function changeFeatures(settings: FeatureSettings, premiumEnforced: boolean) {
  const result = (
    await api.patch<FeatureSettings>('/admin/features', {
      premiumEnforced,
      version: settings.version,
    })
  ).data
  window.dispatchEvent(new Event('freelanceflow-features-changed'))
  return result
}
export interface AdminAccount {
  id: string
  displayName: string | null
  email: string
  createdAt: string
  active: boolean
  role: 'USER' | 'ADMIN'
  plan: Plan
  version: number
}
export interface AdminSummary {
  total: number
  activeFree: number
  activePremium: number
  newThisMonth: number
  signups: { month: string; count: number }[]
}
export async function getAdminSummary() {
  return (await api.get<AdminSummary>('/admin/summary')).data
}
export async function getAdminUsers(params: {
  search: string
  plan: string
  status: string
  page: number
}) {
  const query = new URLSearchParams({ ...params, page: String(params.page), limit: '20' })
  return api.get<AdminAccount[]>(`/admin/users?${query}`)
}
export async function changeUserPlan(user: AdminAccount, plan: Plan) {
  return (
    await api.patch<AdminAccount>(`/admin/users/${user.id}/plan`, { plan, version: user.version })
  ).data
}
