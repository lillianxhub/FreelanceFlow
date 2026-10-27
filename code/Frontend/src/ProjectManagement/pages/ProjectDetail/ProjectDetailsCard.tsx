import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Progress } from '../../../components/ui/progress'
import StatusBadge from '../../../components/StatusBadge'
import { formatDate } from '../../../utils/date'
import { formatDurationSeconds } from '../../../utils/duration'
import type { Project } from '../../../types/project'
import type { Client } from '../../../types/client'

export function ProjectDetailsCard({
  project,
  client,
  totalTrackedSeconds,
  completed,
  totalTaskCount,
  taskProgress,
}: {
  project: Project
  client: Client | undefined
  totalTrackedSeconds: number
  completed: number
  totalTaskCount: number
  taskProgress: number
}) {
  return (
    <Card asChild>
      <aside className="!p-0">
        <CardHeader className="p-6 pb-2">
          <CardTitle>Project details</CardTitle>
          <CardDescription>Scope and schedule</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid gap-4">
            <div className="grid gap-1.5 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary [&>strong]:text-sm [&>strong]:leading-relaxed">
              <span>Clients</span>
              <Link
                className="min-w-0 break-words font-semibold text-primary hover:underline [overflow-wrap:anywhere]"
                title={
                  client?.company_name || client?.name || project.client_name || 'Client not found'
                }
                href={`/clients/${client?.id}`}
              >
                <strong className="break-words [overflow-wrap:anywhere]">
                  {client?.company_name ||
                    client?.name ||
                    project.client_name ||
                    'Client not found'}
                </strong>
              </Link>
            </div>
            <div className="grid gap-1.5 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary [&>strong]:text-sm [&>strong]:leading-relaxed">
              <span>Status</span>
              <StatusBadge status={project.status} />
            </div>
            <div className="grid gap-1.5 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary [&>strong]:text-sm [&>strong]:leading-relaxed">
              <span>Start date</span>
              <strong>{formatDate(project.start_date)}</strong>
            </div>
            <div className="grid gap-1.5 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary [&>strong]:text-sm [&>strong]:leading-relaxed">
              <span>End date</span>
              <strong>{formatDate(project.end_date)}</strong>
            </div>
            <div className="grid gap-1.5 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary [&>strong]:text-sm [&>strong]:leading-relaxed">
              <span>Target hours</span>
              <strong>
                {project.budget_hours === null ? '—' : `${project.budget_hours} hours`}
              </strong>
            </div>
            <div className="grid gap-2 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary">
              <span>Tracked time</span>
              <strong>{formatDurationSeconds(totalTrackedSeconds)}</strong>
            </div>
            <div className="grid gap-2 [&>span:first-child]:text-xs [&>span:first-child]:text-text-secondary">
              <span>Task progress</span>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {completed}/{totalTaskCount}
                </span>
                <strong>{taskProgress}%</strong>
              </div>
              <Progress
                className="h-2 bg-border"
                value={taskProgress}
                indicatorColor={project.color}
              />
            </div>
          </div>
        </CardContent>
      </aside>
    </Card>
  )
}
