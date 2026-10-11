import assert from 'node:assert/strict'
import test from 'node:test'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { renderComponent } from '../../test-support/react'
import { AuthContext } from '../useAuthentication'
import ProtectedRoute from './ProtectedRoute'
import type { AuthContextValue, AuthUser } from '../../types/auth'

test('protected routes wait for auth, redirect guests and show authenticated content', async () => {
  const user: AuthUser = {
    id: 'u1',
    email: 'owner@example.com',
    user_metadata: { full_name: 'Owner' },
  }
  const paths: string[] = []
  const router = {
    replace: (path: string) => {
      paths.push(path)
    },
  }
  for (const state of [
    { loading: true, user: null, text: 'Checking your session' },
    { loading: false, user: null, text: '' },
    { loading: false, user, text: 'Private page' },
  ]) {
    const context: AuthContextValue = {
      loading: state.loading,
      user: state.user,
      session: state.user ? { user: state.user } : null,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
    }
    const view = await renderComponent(
      <AppRouterContext.Provider value={router as never}>
        <AuthContext.Provider value={context}>
          <ProtectedRoute>
            <span>Private page</span>
          </ProtectedRoute>
        </AuthContext.Provider>
      </AppRouterContext.Provider>,
    )
    try {
      assert.ok(view.container.textContent?.includes(state.text))
    } finally {
      await view.unmount()
    }
  }
  assert.deepEqual(paths, ['/login'])
})
