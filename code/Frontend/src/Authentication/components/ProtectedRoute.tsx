import type { PropsWithChildren } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '../useAuthentication'
import { LoadingState } from '../../components/ViewState'

function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState label="Checking your session…" />
      </div>
    )
  if (!user) return null
  return children
}

export default ProtectedRoute
