import type { Metadata } from 'next'
import '../index.css'
import '../styles/App.css'
import { Providers } from './providers'
export const metadata: Metadata = {
  title: 'FreelanceFlow',
  description: 'Manage projects, tasks, time, and finances',
  icons: { icon: '/favicon.svg' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
