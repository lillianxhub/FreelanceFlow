import Link from 'next/link'
import { FiArrowRight } from 'react-icons/fi'
import StatusBadge from '../../components/StatusBadge'
import { Button } from '../../components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import type { DashboardActiveProject } from '../../types/dashboard'

interface Props {
  projects: readonly DashboardActiveProject[]
}

export default function DashboardProjectsTable({ projects }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active projects</CardTitle>
        <CardDescription>Track task progress across projects.</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              View all <FiArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {projects.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="!bg-transparent">Projects</TableHead>
                <TableHead className="w-36 !bg-transparent">Progress</TableHead>
                <TableHead className="w-32 !bg-transparent">Completed tasks</TableHead>
                <TableHead className="w-36 !bg-transparent">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden font-semibold text-text-primary hover:text-primary"
                      href={`/projects/${project.id}`}
                      title={project.name}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color || 'var(--primary)' }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{project.name}</span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">
                          {project.clientName || 'No client specified'}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-32 items-center gap-3">
                      <Progress
                        value={project.taskProgressPercent}
                        indicatorColor={project.color || 'var(--primary)'}
                      />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {Math.round(project.taskProgressPercent)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {project.completedTaskCount} / {project.totalTaskCount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={project.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No active projects yet</p>
        )}
      </CardContent>
    </Card>
  )
}
