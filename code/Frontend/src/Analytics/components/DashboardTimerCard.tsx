import { useEffect, useState } from 'react'
import { FiSquare } from 'react-icons/fi'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { formatDate } from '../../utils/date'
import { formatTimer } from '../../utils/duration'
import type { ApiCurrentTimer } from '../../types/api'
import type { DashboardRecentTimeEntry } from '../../types/dashboard'

interface Props {
  currentTimer: ApiCurrentTimer | null
  recentEntries?: readonly DashboardRecentTimeEntry[] | null
  onStop: () => Promise<void>
}

export default function DashboardTimerCard({ currentTimer, recentEntries, onStop }: Props) {
  const runningEntry = currentTimer?.running ? currentTimer.timeEntry : null
  const safeRecentEntries = Array.isArray(recentEntries) ? recentEntries : []
  const startedAt = runningEntry?.startedAt
  const [now, setNow] = useState(() => Date.now())
  const [stopping, setStopping] = useState(false)
  const latestEntry = safeRecentEntries.at(0)
  const elapsedSeconds = startedAt
    ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
    : 0

  useEffect(() => {
    if (!startedAt) return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [startedAt])

  const handleStop = async () => {
    setStopping(true)
    try {
      await onStop()
    } finally {
      setStopping(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timer</CardTitle>
        <CardDescription>See the timer and recent entries.</CardDescription>
        <CardAction>
          <Badge
            variant="secondary"
            className={
              runningEntry ? 'bg-green-soft text-green' : 'bg-surface-soft text-muted-foreground'
            }
          >
            <span
              className={
                runningEntry ? 'size-2 rounded-full bg-green' : 'size-2 rounded-full bg-subtle'
              }
            />
            {runningEntry ? 'Working' : 'Timer stopped'}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        {runningEntry ? (
          <div className="rounded-xl bg-primary-soft p-4">
            <p className="font-semibold text-text-primary">{runningEntry.project.name}</p>
            {runningEntry.task && (
              <p className="mt-1 text-sm text-primary">{runningEntry.task.title}</p>
            )}
            {runningEntry.description && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {runningEntry.description}
              </p>
            )}
            <p className="mt-5 text-center text-3xl font-bold tracking-wider tabular-nums text-text-primary">
              {formatTimer(elapsedSeconds)}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Started at{' '}
              {formatDate(runningEntry.startedAt, { hour: '2-digit', minute: '2-digit' })}
            </p>
            <Button
              className="mt-4 w-full"
              variant="destructive"
              disabled={stopping}
              onClick={() => void handleStop()}
            >
              <FiSquare aria-hidden="true" /> {stopping ? 'Stopping…' : 'Stop timer'}
            </Button>
          </div>
        ) : latestEntry ? (
          <div className="rounded-xl bg-primary-soft p-4">
            <p className="font-semibold text-text-primary">{latestEntry.projectName}</p>
            <p className="mt-1 text-sm text-primary">
              {latestEntry.taskName || 'No task selected'}
            </p>
            {latestEntry.description && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {latestEntry.description}
              </p>
            )}
            <p className="mt-5 text-center text-3xl font-bold tracking-wider tabular-nums text-text-primary">
              {formatTimer(latestEntry.durationSeconds)}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Recent entries ·{' '}
              {formatDate(latestEntry.startedAt, { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-primary-soft p-6 text-center">
            <p className="font-medium text-text-primary">No time entries yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Recent entries appear here after you track time.
            </p>
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold text-text-primary">Recent time entries</p>
          <div className="divide-y divide-border">
            {safeRecentEntries.length ? (
              safeRecentEntries.map((entry) => (
                <div className="flex items-center justify-between gap-3 py-3" key={entry.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {entry.projectName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.taskName || 'No task selected'} · {formatDate(entry.startedAt)}
                    </p>
                  </div>
                  <strong className="shrink-0 text-sm tabular-nums text-text-primary">
                    {formatTimer(entry.durationSeconds)}
                  </strong>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No time entries yet</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
