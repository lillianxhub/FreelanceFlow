import { api } from '../api/apiClient'

export interface PlannedTask {
  id: string
  projectId: string
  projectName: string
  name: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  available: boolean
}
export interface DailyPlan {
  date: string
  version: number
  tasks: PlannedTask[]
}
export interface TaskPage {
  tasks: PlannedTask[]
  total: number
  page: number
  limit: number
}

export const bangkokDate = (instant = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)

export const getDailyPlan = async (date: string) =>
  (await api.get<DailyPlan>(`/daily-plans/${date}`)).data
export const getPreviousPlan = async (before: string) =>
  (await api.get<DailyPlan>(`/daily-plans/previous?before=${before}`)).data
export const saveDailyPlan = async (plan: DailyPlan, taskIds: string[]) =>
  (await api.put<DailyPlan>(`/daily-plans/${plan.date}`, { version: plan.version, taskIds })).data
export const searchPlanTasks = async (search: string, projectId: string, page: number) => {
  const params = new URLSearchParams({ search, page: String(page), limit: '20' })
  if (projectId) params.set('projectId', projectId)
  return (await api.get<TaskPage>(`/daily-plans/tasks?${params}`)).data
}
