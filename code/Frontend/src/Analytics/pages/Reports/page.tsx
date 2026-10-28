import { useCallback, useMemo, useState } from 'react'
import {
  FiBriefcase,
  FiClock,
  FiDownload,
  FiList,
  FiTrendingDown,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import PageHeader from '../../../components/PageHeader'
import SummaryCard from '../../../components/SummaryCard'
import { ErrorState, LoadingState } from '../../../components/ViewState'
import { Button } from '../../../components/ui/button'
import { useAsyncData } from '../../../hooks/useAsyncData'
import {
  getReportDistribution,
  getReportProjects,
  getReportSummary,
} from '../../../services/report'
import type {
  ReportDistributionData,
  ReportProjectPage,
  ReportSummaryData,
  ReportSummaryQuery,
} from '../../../types/analytics'
import { downloadCsv } from '../../../utils/csv'
import { formatDurationSeconds } from '../../../utils/duration'
import type { ProjectStatus } from '../../../types/project'
import { ReportCharts } from '../../components/ReportCharts'
import { ReportFilters } from '../../components/ReportFilters'
import { ReportProjectsTable } from '../../components/ReportProjectsTable'

const emptyReport: ReportSummaryData = {
  generatedAt: '',
  filters: { clients: [], projects: [] },
  summary: {
    totalTrackedSeconds: 0,
    trackedTimeTrendPercent: null,
    timeEntryCount: 0,
    projectsWithTime: 0,
    totalProjects: 0,
    clientsWithTime: 0,
    totalClients: 0,
  },
}

const emptyDistribution: ReportDistributionData = {
  groupBy: 'CLIENT',
  items: [],
}

const emptyProjects: ReportProjectPage = {
  items: [],
  page: 1,
  totalPages: 1,
  total: 0,
}

function previousPeriodLabel(from: string, to: string): string {
  const start = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const previousStart = new Date(start.getTime() - days * 86_400_000)
  const previousEnd = new Date(start.getTime() - 86_400_000)
  const fullDate = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const dayMonth = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

  if (previousStart.getUTCFullYear() === previousEnd.getUTCFullYear()) {
    if (previousStart.getUTCMonth() === previousEnd.getUTCMonth()) {
      return `${previousStart.getUTCDate()}–${fullDate.format(previousEnd)}`
    }

    return `${dayMonth.format(previousStart)}–${fullDate.format(previousEnd)}`
  }

  return `${fullDate.format(previousStart)}–${fullDate.format(previousEnd)}`
}

function ReportsPage() {
  const [range, setRange] = useState({ from: '', to: '' })
  const [clientId, setClientId] = useState('ALL')
  const [projectId, setProjectId] = useState('ALL')
  const [status, setStatus] = useState<'ALL' | ProjectStatus>('ALL')
  const [groupBy, setGroupBy] = useState<'CLIENT' | 'PROJECT'>('CLIENT')
  const [page, setPage] = useState(1)
  const queryKey = `${range.from}:${range.to}:${clientId}:${projectId}:${status}`
  const query: ReportSummaryQuery = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      clientId: clientId === 'ALL' ? undefined : clientId,
      projectId: projectId === 'ALL' ? undefined : projectId,
      status: status === 'ALL' ? undefined : status,
    }),
    [range.from, range.to, clientId, projectId, status],
  )
  const hasDateRange = Boolean(range.from && range.to)
  const validRange = hasDateRange && range.from <= range.to
  const hasPartialRange = Boolean(range.from) !== Boolean(range.to)
  const canLoad = !hasPartialRange && (!hasDateRange || validRange)
  const loadSummary = useCallback(
    () => (canLoad ? getReportSummary(query) : Promise.resolve(emptyReport)),
    [query, canLoad],
  )
  const loadDistribution = useCallback(
    () => (canLoad ? getReportDistribution(query, groupBy) : Promise.resolve(emptyDistribution)),
    [query, groupBy, canLoad],
  )
  const loadProjects = useCallback(
    () => (canLoad ? getReportProjects(query, page) : Promise.resolve(emptyProjects)),
    [query, page, canLoad],
  )
  const {
    data,
    loading: summaryLoading,
    error: summaryError,
    refresh: refreshSummary,
  } = useAsyncData(loadSummary, emptyReport, queryKey)
  const {
    data: distribution,
    loading: distributionLoading,
    error: distributionError,
    refresh: refreshDistribution,
  } = useAsyncData(loadDistribution, emptyDistribution, `${queryKey}:${groupBy}`)
  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refresh: refreshProjects,
  } = useAsyncData(loadProjects, emptyProjects, `${queryKey}:${page}`)
  const loading = summaryLoading || distributionLoading || projectsLoading
  const error = summaryError || distributionError || projectsError
  const refresh = () => {
    void Promise.all([refreshSummary(), refreshDistribution(), refreshProjects()])
  }
  const { summary } = data
  const projectRows = projects.items.map((project) => ({
    project,
    targetHours: project.targetSeconds == null ? 0 : project.targetSeconds / 3600,
    usedHours: project.trackedSeconds / 3600,
  }))
  const selectedClientName =
    data.filters.clients.find((client) => client.id === clientId)?.name || 'Selected client'
  const trendPercent = summary.trackedTimeTrendPercent
  const trend =
    trendPercent == null ? (
      hasDateRange ? (
        'No tracked time in the comparison period'
      ) : (
        'All time'
      )
    ) : (
      <span
        className={`inline-flex flex-wrap items-center gap-1 font-semibold ${trendPercent >= 0 ? 'text-green' : 'text-destructive'}`}
      >
        {trendPercent >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
        {trendPercent >= 0 ? 'Increased' : 'Decreased'} {Math.abs(trendPercent).toFixed(0)}% versus{' '}
        {previousPeriodLabel(range.from, range.to)}
      </span>
    )
  const exportReport = () =>
    downloadCsv(
      hasDateRange ? `time-report-${range.from}-${range.to}.csv` : 'time-report-all.csv',
      [
        ['Projects', 'Clients', 'Target time', 'Time spent', 'Used (%)', 'Progress (%)', 'Status'],
        ...projectRows.map(({ project, targetHours, usedHours }) => [
          project.projectName,
          project.clientName,
          targetHours || '',
          usedHours.toFixed(2),
          project.usagePercent?.toFixed(1) ?? '',
          project.taskProgressPercent.toFixed(1),
          project.status,
        ]),
      ],
    )

  return (
    <div className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-6">
      <PageHeader
        eyebrow="Manage / Reports"
        title="Reports"
        description="Analyze time use and project progress."
        actions={
          <Button
            className="h-10"
            onClick={exportReport}
            disabled={!canLoad || projects.items.length === 0}
          >
            <FiDownload /> Export this page CSV
          </Button>
        }
      />

      <ReportFilters
        range={range}
        clientId={clientId}
        projectId={projectId}
        status={status}
        canLoad={canLoad}
        filters={data.filters}
        onRangeChange={(nextRange) => {
          setRange(nextRange)
          setPage(1)
        }}
        onClientChange={(nextClientId) => {
          setClientId(nextClientId)
          setProjectId('ALL')
          setPage(1)
        }}
        onProjectChange={(nextProjectId) => {
          setProjectId(nextProjectId)
          setPage(1)
        }}
        onStatusChange={(nextStatus) => {
          setStatus(nextStatus)
          setProjectId('ALL')
          setPage(1)
        }}
      />

      {hasPartialRange ? (
        <p className="text-sm text-destructive">
          Select both dates, or leave both blank to view all time.
        </p>
      ) : hasDateRange && !validRange ? (
        <p className="text-sm text-destructive">Start date must be on or before end date</p>
      ) : loading ? (
        <LoadingState label="Preparing report…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total time"
              icon={<FiClock />}
              value={formatDurationSeconds(summary.totalTrackedSeconds)}
              foot={trend}
              accent={trendPercent == null ? 'blue' : trendPercent >= 0 ? 'green' : 'red'}
              compact
            />
            <SummaryCard
              label="Time entries"
              icon={<FiList />}
              value={summary.timeEntryCount}
              unit="entries"
              foot={hasDateRange ? 'in the selected period' : 'All time'}
              accent="blue"
            />
            <SummaryCard
              label="Projects with tracked time"
              icon={<FiBriefcase />}
              value={summary.projectsWithTime}
              unit="Projects"
              foot={`of total ${summary.totalProjects} Projects`}
              accent="violet"
            />
            <SummaryCard
              label="Clients with tracked time"
              icon={<FiUsers />}
              value={summary.clientsWithTime}
              unit="Clients"
              foot={`of total ${summary.totalClients} Clients`}
              accent="orange"
            />
          </section>

          <ReportCharts
            distribution={distribution}
            projects={projects}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            clientId={clientId}
            selectedClientName={selectedClientName}
            hasDateRange={hasDateRange}
          />

          <ReportProjectsTable
            projects={projects}
            projectRows={projectRows}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}

export default ReportsPage
