'use client'
import Screen from '../../../Analytics/pages/Dashboard/page'
import { DashboardProvider } from '../../../Analytics/DashboardContext'
export default function Page() {
  return (
    <>
      <DashboardProvider>
        <Screen />
      </DashboardProvider>
    </>
  )
}
