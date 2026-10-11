'use client'
import ProtectedRoute from '../../Authentication/components/ProtectedRoute'
import { TimerProvider } from '../../TimeTracking/TimerContext'
import AppLayout from '../../components/AppLayout'
import { FinanceProvider } from '../../Finance/FinanceContext'
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <TimerProvider>
        <FinanceProvider>
          <AppLayout>{children}</AppLayout>
        </FinanceProvider>
      </TimerProvider>
    </ProtectedRoute>
  )
}
