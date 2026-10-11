'use client'
import ProtectedRoute from '../../Authentication/components/ProtectedRoute'
import { TimerProvider } from '../../TimeTracking/TimerContext'
import AppLayout from '../../components/AppLayout'
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <TimerProvider>
        <AppLayout>{children}</AppLayout>
      </TimerProvider>
    </ProtectedRoute>
  )
}
