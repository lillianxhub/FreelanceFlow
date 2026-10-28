import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import { formatDate } from '../../../utils/date'
import { formatDurationSeconds } from '../../../utils/duration'
import type { Task } from '../../../types/task'
import type { useProjectTimeEntries } from './useProjectTimeEntries'

function formatEntryStartTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function ProjectTimeEntriesCard({
  tasks,
  timeEntries,
}: {
  tasks: Task[]
  timeEntries: ReturnType<typeof useProjectTimeEntries>
}) {
  return (
    <Card asChild>
      <section className="!p-0">
        <CardHeader className="p-6 pb-2">
          <div className="grid gap-1">
            <CardTitle>Recent time entries</CardTitle>
            <CardDescription>Recent time entries for this project</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Table
            pagination={{
              page: Math.min(timeEntries.page, timeEntries.totalPages),
              totalPages: timeEntries.totalPages,
              total: timeEntries.total,
              onPageChange: timeEntries.setPage,
            }}
          >
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Tasks / Details</TableHead>
                <TableHead className="w-40">Start timer</TableHead>
                <TableHead className="w-32 text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="min-w-0 whitespace-normal">
                    <div className="grid min-w-0 gap-1">
                      <strong
                        className="truncate text-sm font-semibold text-text-primary"
                        title={
                          tasks.find((task) => task.id === entry.task_id)?.name ||
                          entry.task_name ||
                          'No task selected'
                        }
                      >
                        {tasks.find((task) => task.id === entry.task_id)?.name ||
                          entry.task_name ||
                          'No task selected'}
                      </strong>
                      <span
                        className="truncate text-xs text-text-secondary"
                        title={entry.description?.trim() || 'No description'}
                      >
                        {entry.description?.trim() || 'No description'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary">
                    <div className="grid gap-0.5">
                      <span>{formatDate(entry.started_at)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatEntryStartTime(entry.started_at)} min
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-text-primary">
                    {formatDurationSeconds(entry.duration_seconds)}
                  </TableCell>
                </TableRow>
              ))}
              {timeEntries.entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>{timeEntries.error || 'No time entries yet'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </section>
    </Card>
  )
}
