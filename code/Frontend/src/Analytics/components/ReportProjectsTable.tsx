import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import StatusBadge from '../../components/StatusBadge'
import type { ReportProjectPage } from '../../types/analytics'
import { formatDurationSeconds } from '../../utils/duration'

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

type ProjectRow = {
  project: ReportProjectPage['items'][number]
  targetHours: number
  usedHours: number
}

export function ReportProjectsTable({
  projects,
  projectRows,
  onPageChange,
}: {
  projects: ReportProjectPage
  projectRows: ProjectRow[]
  onPageChange: (page: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Time breakdown by project</CardTitle>
        <CardDescription>
          Time, targets, and progress for projects ({projects.total} entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table
          pagination={{
            page: projects.page,
            totalPages: projects.totalPages,
            total: projects.total,
            onPageChange,
          }}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Project name</TableHead>
              <TableHead>NameClients</TableHead>
              <TableHead className="w-32">Target time</TableHead>
              <TableHead className="w-32">Time spent</TableHead>
              <TableHead className="w-36">Used</TableHead>
              <TableHead className="w-36">Progress</TableHead>
              <TableHead className="w-36">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectRows.map(({ project, targetHours }) => (
              <TableRow key={project.projectId}>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <strong className="truncate" title={project.projectName}>
                      {project.projectName}
                    </strong>
                  </div>
                </TableCell>
                <TableCell>{project.clientName}</TableCell>
                <TableCell>{targetHours ? `${targetHours.toFixed(1)} h` : 'No target'}</TableCell>
                <TableCell>{formatDurationSeconds(project.trackedSeconds)}</TableCell>
                <TableCell>
                  <div className="flex min-w-28 items-center gap-2">
                    <Progress value={clampPercent(project.usagePercent ?? 0)} />
                    <span className="w-10 text-right">
                      {project.usagePercent == null ? '—' : `${project.usagePercent.toFixed(0)}%`}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-28 items-center gap-2">
                    <Progress
                      value={clampPercent(project.taskProgressPercent)}
                      indicatorColor="var(--chart-2)"
                    />
                    <span className="w-10 text-right">
                      {project.taskProgressPercent.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={project.status} />
                </TableCell>
              </TableRow>
            ))}
            {!projectRows.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No projects match your filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
