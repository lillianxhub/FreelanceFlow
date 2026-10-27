import { useMemo } from 'react'
import { Card, CardContent } from '../../components/ui/card'
import { DatePicker } from '../../components/ui/date-picker'
import { Label } from '../../components/ui/label'
import { NativeSelect } from '../../components/ui/native-select'
import { projectStatusLabels } from '../../ProjectManagement/components/projectStatusOptions'
import type { ProjectStatus } from '../../types/project'
import type { ReportSummaryData } from '../../types/analytics'

type Props = {
  range: { from: string; to: string }
  clientId: string
  projectId: string
  status: 'ALL' | ProjectStatus
  canLoad: boolean
  filters: ReportSummaryData['filters']
  onRangeChange: (range: { from: string; to: string }) => void
  onClientChange: (clientId: string) => void
  onProjectChange: (projectId: string) => void
  onStatusChange: (status: 'ALL' | ProjectStatus) => void
}

export function ReportFilters({
  range,
  clientId,
  projectId,
  status,
  canLoad,
  filters,
  onRangeChange,
  onClientChange,
  onProjectChange,
  onStatusChange,
}: Props) {
  const availableProjects = useMemo(
    () =>
      filters.projects
        .filter((project) => clientId === 'ALL' || project.clientId === clientId)
        .filter((project) => status === 'ALL' || project.status === status),
    [clientId, status, filters.projects],
  )
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="report-from">From date</Label>
          <DatePicker
            id="report-from"
            value={range.from}
            placeholder="Select start date"
            onChange={(value) => {
              onRangeChange({ ...range, from: value })
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="report-status">StatusProjects</Label>
          <NativeSelect
            id="report-status"
            value={status}
            disabled={!canLoad}
            onChange={(event) => {
              onStatusChange(event.target.value as 'ALL' | ProjectStatus)
            }}
          >
            <option value="ALL">All statuses</option>
            {Object.entries(projectStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="report-to">To date</Label>
          <DatePicker
            id="report-to"
            value={range.to}
            placeholder="Select end date"
            onChange={(value) => {
              onRangeChange({ ...range, to: value })
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="report-client">Clients</Label>
          <NativeSelect
            id="report-client"
            value={clientId}
            disabled={!canLoad}
            onChange={(event) => {
              onClientChange(event.target.value)
            }}
          >
            <option value="ALL">All clients</option>
            {filters.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="report-project">Projects</Label>
          <NativeSelect
            id="report-project"
            value={projectId}
            disabled={!canLoad}
            onChange={(event) => {
              onProjectChange(event.target.value)
            }}
          >
            <option value="ALL">All projects</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </CardContent>
    </Card>
  )
}
