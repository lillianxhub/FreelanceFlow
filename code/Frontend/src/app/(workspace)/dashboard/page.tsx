'use client'
import Screen from '../../../Analytics/pages/Dashboard/page'
import TodayPlanner from '../../../components/TodayPlanner'
import { DashboardProvider } from '../../../Analytics/DashboardContext'
export default function Page() {
  return (
    <>
      <TodayPlanner />
      <DashboardProvider>
        <Screen />
      </DashboardProvider>
    </>
  )
}
