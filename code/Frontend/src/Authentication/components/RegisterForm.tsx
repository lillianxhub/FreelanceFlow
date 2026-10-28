import AuthenticationLayout from './AuthenticationLayout'
import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthInput from './AuthInput'
import { Button } from '../../components/ui/button'
import { useAuth } from '../useAuthentication'
import { getErrorMessage } from '../../api/apiError'
import { BrandLogo } from '../../components/BrandLogo'
import {
  hasRequiredPassword,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  passwordsMatch,
} from '../authentication.validators'
import type { RegisterFieldErrors, RegisterFormValues } from '../../types/auth'

function RegisterForm() {
  const [form, setForm] = useState<RegisterFormValues>({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register } = useAuth()

  const validateField = (
    name: keyof RegisterFormValues,
    values: RegisterFormValues,
  ): string | undefined => {
    const value = values[name].trim()

    if (!value) return 'Complete this field'
    if (name === 'email' && !isValidEmail(values.email)) return 'Enter a valid email address'
    if (name === 'phone' && !isValidPhone(values.phone)) return 'Enter a phone number 10 Main'
    if (name === 'password' && !hasRequiredPassword(values.password))
      return 'Passwordmust have at least 8 characters and no more than 72 bytes UTF-8'
    if (name === 'confirmPassword' && !passwordsMatch(values.password, values.confirmPassword)) {
      return 'Passwords do not match'
    }

    return undefined
  }

  const validateForm = (values: RegisterFormValues): RegisterFieldErrors => {
    const names: Array<keyof RegisterFormValues> = [
      'displayName',
      'firstName',
      'lastName',
      'email',
      'phone',
      'password',
      'confirmPassword',
    ]

    return names.reduce<RegisterFieldErrors>((errors, name) => {
      const fieldError = validateField(name, values)
      if (fieldError) errors[name] = fieldError
      return errors
    }, {})
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof RegisterFormValues
    const value = name === 'phone' ? normalizePhone(e.target.value) : e.target.value
    const nextForm = { ...form, [name]: value }
    setForm(nextForm)

    if (fieldErrors[name]) {
      setFieldErrors((current) => ({
        ...current,
        [name]: validateField(name, nextForm),
      }))
    }

    if ((name === 'password' || name === 'confirmPassword') && fieldErrors.confirmPassword) {
      setFieldErrors((current) => ({
        ...current,
        confirmPassword: validateField('confirmPassword', nextForm),
      }))
    }
  }

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const name = e.target.name as keyof RegisterFormValues
    setFieldErrors((current) => ({
      ...current,
      [name]: validateField(name, form),
    }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const validationErrors = validateForm(form)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setLoading(true)

    try {
      await register({
        displayName: form.displayName,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      router.replace('/login')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not register'))
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
        <h1>Register</h1>
        <p className="auth-description">Create your freelance workspace</p>
        {error && <p className="auth-error">{error}</p>}

        <AuthInput
          label="Display name"
          type="text"
          name="displayName"
          value={form.displayName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.displayName}
          autoComplete="nickname"
        />
        <AuthInput
          label="Name"
          type="text"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.firstName}
          autoComplete="given-name"
        />
        <AuthInput
          label="Last name"
          type="text"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.lastName}
          autoComplete="family-name"
        />
        <AuthInput
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <AuthInput
          label="Phone number"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.phone}
          autoComplete="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
        />
        <AuthInput
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.password}
          autoComplete="new-password"
          minLength={8}
        />
        <AuthInput
          label="Confirm password"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          minLength={8}
        />

        <Button className="min-h-10 w-full" type="submit" disabled={loading}>
          {loading ? 'Registering…' : 'Register'}
        </Button>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </AuthenticationLayout>
  )
}

export default RegisterForm
