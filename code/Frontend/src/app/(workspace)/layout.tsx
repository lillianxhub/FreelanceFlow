'use client'
import ProtectedRoute from '../../Authentication/components/ProtectedRoute'
import { TimerProvider } from '../../TimeTracking/TimerContext'
import AppLayout from '../../components/AppLayout'
import { FeaturesProvider } from '../../Features/FeaturesContext'
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <TimerProvider>
        <FeaturesProvider>
          <AppLayout>{children}</AppLayout>
        </FeaturesProvider>
      </TimerProvider>
    </ProtectedRoute>
  )
}
