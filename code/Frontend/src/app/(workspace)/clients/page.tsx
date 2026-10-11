'use client'
import Screen from '../../../ClientManagement/pages/Clients/page'
import { ClientsProvider } from '../../../ClientManagement/ClientsContext'
export default function Page() {
  return (
    <ClientsProvider>
      <Screen />
    </ClientsProvider>
  )
}
