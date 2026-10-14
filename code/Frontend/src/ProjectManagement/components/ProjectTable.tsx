import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/ui/table'
import Link from 'next/link'
import type { ProjectTableProps } from '../../types/projectsPage'
import ProjectStatus from './ProjectStatus'

export default function ProjectsTable({ projects, clients }: ProjectTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Projects</TableHead>
          <TableHead>Clients</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Billing type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          const client = clients.find((item) => item.id === project.client_id)

          return (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
              </TableCell>
              <TableCell>{client?.company_name || client?.name || '—'}</TableCell>
              <TableCell>
                <ProjectStatus status={project.status} />
              </TableCell>
              <TableCell>{project.billing_type === 'HOURLY' ? 'Hourly' : 'Fixed price'}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
