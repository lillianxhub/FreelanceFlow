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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import type { DashboardOpenTask } from '../../types/dashboard'

interface Props {
  tasks: readonly DashboardOpenTask[]
}

export default function DashboardTasksTable({ tasks }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming tasks</CardTitle>
        <CardDescription>Tasks you still need to complete.</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              View all <FiArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {tasks.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="!bg-transparent">Tasks</TableHead>
                <TableHead className="!bg-transparent">Projects</TableHead>
                <TableHead className="!bg-transparent">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task, index) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link
                      className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden font-semibold text-text-primary hover:text-primary"
                      href={`/projects/${task.projectId}`}
                      title={task.name}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 truncate">{task.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{task.projectName}</TableCell>
                  <TableCell>
                    <StatusBadge status={task.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No open tasks</p>
        )}
      </CardContent>
    </Card>
  )
}
