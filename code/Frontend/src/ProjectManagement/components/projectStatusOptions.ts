import type { ProjectStatus } from '../../types/project'

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export const allowedStatusTransitions: Record<ProjectStatus, readonly ProjectStatus[]> = {
  PLANNED: ['PLANNED', 'ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'],
  ON_HOLD: ['ON_HOLD', 'ACTIVE', 'ARCHIVED'],
  COMPLETED: ['COMPLETED', 'ARCHIVED'],
  ARCHIVED: ['ARCHIVED', 'PLANNED', 'ACTIVE'],
}

export const statusSelectClasses: Record<ProjectStatus, string> = {
  PLANNED: '!bg-violet-soft !text-violet',
  ACTIVE: '!bg-green-soft !text-green',
  ON_HOLD: '!bg-orange-soft !text-orange',
  COMPLETED: '!bg-green-soft !text-green',
  ARCHIVED: '!bg-red-soft !text-destructive',
}
