'use client'
import { AuthProvider } from '../Authentication/AuthenticationContext'
import { Toaster } from '../components/ui/sonner'
import { ThemeProvider } from 'next-themes'
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  )
}
