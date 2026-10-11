import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../components/ui/table'
import Link from 'next/link'
import type { ClientTableProps } from '../../types/clientsPage'
import ClientStatus from './ClientStatus'

export default function ClientsTable({ clients }: ClientTableProps) {
  return (
    <div className="table-wrap">
      <Table className="data-table">
        <TableHeader>
          <TableRow>
            <TableHead>ลูกค้า</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead>โทรศัพท์</TableHead>
            <TableHead>สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link href={`/clients/${client.id}`}>{client.company_name || client.name}</Link>
              </TableCell>
              <TableCell>{client.email || '—'}</TableCell>
              <TableCell>{client.phone || '—'}</TableCell>
              <TableCell>
                <ClientStatus status={client.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
