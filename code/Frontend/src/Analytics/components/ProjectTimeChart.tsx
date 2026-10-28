import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart'
import type { ProjectTimeChartProps } from '../../types/analytics'

export default function ProjectTimeChart({ data }: ProjectTimeChartProps) {
  if (!data.length) return <p className="inline-empty">No data for this date range</p>
  return (
    <ChartContainer
      className="h-[270px] w-full aspect-auto"
      config={{ hours: { label: 'hours', color: 'var(--chart-1)' } }}
    >
      <BarChart data={[...data]}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 'var(--font-size-sm)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 'var(--font-size-sm)' }} axisLine={false} tickLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="hours" name="hours" fill="var(--color-hours)" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
