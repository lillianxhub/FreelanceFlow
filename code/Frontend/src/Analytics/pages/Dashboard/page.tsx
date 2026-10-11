import { useState } from 'react'
import { FiBriefcase, FiCheckSquare, FiClock, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'
import { toast } from 'sonner'
import { getErrorMessage } from '../../../api/apiError'
import PageHeader from '../../../components/PageHeader'
import SummaryCard from '../../../components/SummaryCard'
import { ErrorState, LoadingState } from '../../../components/ViewState'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Label } from '../../../components/ui/label'
import { NativeSelect } from '../../../components/ui/native-select'
import { activityChartPoints, formatChartDuration, weeklyChartPoints } from '../../../lib/dashboard'
import { stopTimer } from '../../../services/timeTracking'
import { useCurrentTimer } from '../../../TimeTracking/useCurrentTimer'
import type { DashboardChartPeriod } from '../../../types/dashboard'
import DashboardProjectsTable from '../../components/DashboardProjectsTable'
import DashboardTasksTable from '../../components/DashboardTasksTable'
import DashboardTimerCard from '../../components/DashboardTimerCard'
import ProductivityChart from '../../components/ProductivityChart'
import { useDashboard } from '../../useDashboard'
import { useDashboardActivity } from '../../useDashboardActivity'

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span>No prior week data</span>
  const positive = value >= 0
  return (
    <span
      className={
        positive
          ? 'inline-flex items-center gap-1 font-semibold text-green'
          : 'inline-flex items-center gap-1 font-semibold text-destructive'
      }
    >
      {positive ? <FiTrendingUp aria-hidden="true" /> : <FiTrendingDown aria-hidden="true" />}
      {Math.abs(value)}% from last week
    </span>
  )
}

function DashboardPage() {
  const { data, loading, error, refresh, loadActivity } = useDashboard()
  const { currentTimer, refreshCurrentTimer } = useCurrentTimer()
  const [period, setPeriod] = useState<DashboardChartPeriod>('WEEK')
  const {
    activity,
    loading: activityLoading,
    error: activityError,
    retry: retryActivity,
  } = useDashboardActivity(period, loadActivity)

  const chartData =
    period === 'WEEK'
      ? weeklyChartPoints(data.dailyWork)
      : activity?.period === period
        ? activityChartPoints(period, activity.points)
        : []
  const summary = data.summary
  const generatedAt = data.generatedAt ? new Date(data.generatedAt) : new Date()

  if (loading) return <LoadingState label="Loading dashboard…" />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  async function handleStopTimer() {
    try {
      await stopTimer()
      await refreshCurrentTimer()
      await refresh()
      if (period !== 'WEEK') {
        retryActivity()
      }
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, 'Could not stop the timer'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en-US', {
          dateStyle: 'full',
          timeZone: 'Asia/Bangkok',
        }).format(generatedAt)}
        title="Work overview"
        description="See your time, projects, and important tasks in one place."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Work summary">
        <SummaryCard
          label="Time tracked this week"
          value={formatChartDuration(summary.weekTrackedSeconds)}
          icon={<FiClock aria-hidden="true" />}
          accent="blue"
          compact
          foot={<Trend value={summary.weekTrendPercent} />}
        />
        <SummaryCard
          label="Target hours used"
          value={
            summary.targetUsagePercent === null ? '—' : `${Math.round(summary.targetUsagePercent)}%`
          }
          icon={<FiClock aria-hidden="true" />}
          accent="violet"
          compact
          foot={`${formatChartDuration(summary.activeProjectTrackedSeconds)} / ${formatChartDuration(summary.activeProjectTargetSeconds)}`}
        />
        <SummaryCard
          label="Active projects"
          value={summary.activeProjectCount}
          unit="Projects"
          icon={<FiBriefcase aria-hidden="true" />}
          accent="orange"
          foot="Currently active"
        />
        <SummaryCard
          label="Completed tasks"
          value={`${summary.completedTaskCount} / ${summary.totalTaskCount}`}
          icon={<FiCheckSquare aria-hidden="true" />}
          accent="green"
          compact
          foot={`Completed ${Math.round(summary.completedTaskPercent)}%`}
        />
      </section>
      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <Card>
          <CardHeader className="gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <CardTitle>Work hours</CardTitle>
              <CardDescription>Time tracked for the selected period</CardDescription>
            </div>
            <div className="grid min-w-36 gap-2">
              <Label htmlFor="dashboard-period">Period</Label>
              <NativeSelect
                id="dashboard-period"
                value={period}
                onChange={(event) => {
                  const nextPeriod = event.target.value as DashboardChartPeriod
                  setPeriod(nextPeriod)
                }}
              >
                <option value="WEEK">Week</option>
                <option value="MONTH">Month</option>
                <option value="YEAR">Year</option>
              </NativeSelect>
            </div>
          </CardHeader>
          <CardContent>
            {period !== 'WEEK' && activityLoading ? (
              <LoadingState label="Loading chart…" />
            ) : period !== 'WEEK' && activityError ? (
              <ErrorState message={activityError} onRetry={retryActivity} />
            ) : (
              <ProductivityChart data={chartData} />
            )}
          </CardContent>
        </Card>
        <DashboardTimerCard
          currentTimer={currentTimer}
          recentEntries={data.recentTimeEntries ?? []}
          onStop={handleStopTimer}
        />
      </section>
      <section className="grid items-start gap-6 2xl:grid-cols-2">
        <DashboardProjectsTable projects={data.activeProjects} />
        <DashboardTasksTable tasks={data.openTasks} />
      </section>
    </div>
  )
}

export default DashboardPage
