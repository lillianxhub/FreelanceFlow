import type { Metadata } from 'next'
import '../index.css'
import '../styles/App.css'
import { Providers } from './providers'
export const metadata: Metadata = { title: 'FreelanceFlow', description: 'จัดการงานและเวลา' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
