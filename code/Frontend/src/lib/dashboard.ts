import type { ProductivityPoint } from '../types/analytics'
import type { DashboardDailyWork } from '../types/dashboard'
import { splitDurationSeconds } from '../utils/duration'

export function formatChartDuration(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitDurationSeconds(totalSeconds)
  const parts = [
    hours ? `${hours} h` : '',
    minutes ? `${minutes} min` : '',
    seconds ? `${seconds} s` : '',
  ].filter(Boolean)
  return parts.join(' ') || '0 s'
}

export function weeklyChartPoints(days: DashboardDailyWork[]): ProductivityPoint[] {
  return days.map((item) => ({
    key: item.date,
    day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
      new Date(`${item.date}T12:00:00+07:00`),
    ),
    totalSeconds: item.trackedSeconds,
  }))
}

export function activityChartPoints(
  period: 'MONTH' | 'YEAR',
  points: DashboardDailyWork[],
): ProductivityPoint[] {
  return points.map((item) => ({
    key: item.date,
    day:
      period === 'YEAR'
        ? new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
            new Date(`${item.date}T12:00:00+07:00`),
          )
        : String(Number(item.date.slice(8, 10))),
    totalSeconds: item.trackedSeconds,
  }))
}
