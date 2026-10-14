'use client'
import { AuthProvider } from '../Authentication/AuthenticationContext'
import { Toaster } from '../components/ui/sonner'
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors closeButton />
    </AuthProvider>
  )
}
