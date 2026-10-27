import type { PropsWithChildren } from 'react'
import { ThemeToggle } from '../../components/ThemeToggle'

export default function AuthenticationLayout({ children }: PropsWithChildren) {
  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}
