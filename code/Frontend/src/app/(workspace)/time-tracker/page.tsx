'use client'
import Screen from '../../../TimeTracking/pages/TimeTracker/page'
import { TimeEntriesProvider } from '../../../TimeTracking/TimeEntriesContext'
export default function Page() {
  return (
    <TimeEntriesProvider>
      <Screen />
    </TimeEntriesProvider>
  )
}
