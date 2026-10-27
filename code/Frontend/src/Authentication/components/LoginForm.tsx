import { Button } from '../../components/ui/button'
import AuthenticationLayout from './AuthenticationLayout'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthInput from './AuthInput'
import { useAuth } from '../useAuthentication'
import { getErrorMessage } from '../../api/apiError'
import { BrandLogo } from '../../components/BrandLogo'

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(form.email, form.password)
      router.replace('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not sign in'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticationLayout>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <BrandLogo />
          <strong>FreelanceFlow</strong>
        </div>
        <h1>Sign in</h1>
        {error && <p className="auth-error">{error}</p>}

        <AuthInput
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
        />
        <AuthInput
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
        />

        <Button variant="default" className="h-10 w-full" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="auth-footer">
          No account yet? <Link href="/register">Register</Link>
        </p>
      </form>
    </AuthenticationLayout>
  )
}

export default LoginForm
