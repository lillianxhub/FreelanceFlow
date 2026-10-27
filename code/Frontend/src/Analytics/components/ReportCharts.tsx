import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import type { ReportDistributionData, ReportProjectPage } from '../../types/analytics'

function truncateChartLabel(value: string): string {
  const characters = Array.from(value)
  return characters.length > 12 ? `${characters.slice(0, 12).join('')}…` : value
}

type Props = {
  distribution: ReportDistributionData
  projects: ReportProjectPage
  groupBy: 'CLIENT' | 'PROJECT'
  onGroupByChange: (groupBy: 'CLIENT' | 'PROJECT') => void
  clientId: string
  selectedClientName: string
  hasDateRange: boolean
}

export function ReportCharts({
  distribution,
  projects,
  groupBy,
  onGroupByChange,
  clientId,
  selectedClientName,
  hasDateRange,
}: Props) {
  const showProjectTimeChart = groupBy === 'PROJECT'
  const timeChartData = distribution.items.map((item) => ({
    name: item.name,
    hours: Number((item.trackedSeconds / 3600).toFixed(2)),
  }))
  const timeChartTitle = showProjectTimeChart ? 'Time by project' : 'Time by client'
  const timeChartDescription =
    clientId !== 'ALL'
      ? `Hours tracked${showProjectTimeChart ? 'By project' : ''}for client ${selectedClientName}`
      : `Hours tracked by${showProjectTimeChart ? 'Projects' : 'Clients'}${hasDateRange ? 'in the selected period' : 'All time'}`
  const projectChartData = projects.items
    .filter((project) => project.trackedSeconds > 0 || project.taskProgressPercent > 0)
    .map((project) => ({
      name: project.projectName,
      usage: Number((project.usagePercent ?? 0).toFixed(1)),
      progress: Number(project.taskProgressPercent.toFixed(1)),
    }))

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>{timeChartTitle}</CardTitle>
              <CardDescription className="break-words">{timeChartDescription}</CardDescription>
            </div>
            <ToggleGroup
              type="single"
              value={groupBy}
              onValueChange={(value) => {
                if (value === 'CLIENT' || value === 'PROJECT') {
                  onGroupByChange(value)
                }
              }}
              aria-label="Group time by"
            >
              <ToggleGroupItem value="CLIENT" aria-label="Time by client">
                By client
              </ToggleGroupItem>
              <ToggleGroupItem value="PROJECT" aria-label="Time by project">
                By project
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {timeChartData.length ? (
            <ChartContainer
              className="h-[300px] w-full min-w-0 aspect-auto"
              config={{ hours: { label: 'hours', color: 'var(--chart-1)' } }}
            >
              <BarChart data={timeChartData} layout="vertical" margin={{ left: 12, right: 28 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" axisLine={false} tickLine={false} unit=" h" />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tick={{ fontSize: 12 }}
                  tickFormatter={showProjectTimeChart ? truncateChartLabel : undefined}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" name="hours" fill="var(--color-hours)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No time data for this period
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time usage versus task progress</CardTitle>
          <CardDescription>
            Compare time used with tasks completed for these projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectChartData.length ? (
            <div className="w-full overflow-x-auto">
              <ChartContainer
                className="h-[320px] min-w-[44rem] aspect-auto"
                config={{
                  usage: { label: 'Hours used', color: 'var(--chart-1)' },
                  progress: { label: 'Task progress', color: 'var(--chart-2)' },
                }}
              >
                <BarChart data={projectChartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickFormatter={truncateChartLabel}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                    domain={[0, (maximum: number) => Math.max(100, Math.ceil(maximum / 20) * 20)]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="usage"
                    name="Hours used"
                    fill="var(--color-usage)"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="progress"
                    name="Task progress"
                    fill="var(--color-progress)"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No projects for this period
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
