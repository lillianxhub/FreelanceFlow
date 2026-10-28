import { useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import FormLabel from '../../components/FormLabel'
import PasswordInput from '../../components/PasswordInput'
import { hasRequiredPassword } from '../../Authentication/authentication.validators'
import { getErrorMessage } from '../../api/apiError'
import { changePassword } from '../../services/profile'
import type { ChangePasswordInput } from '../../types/profile'

const emptyPassword: ChangePasswordInput = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export function ChangePasswordForm() {
  const [form, setForm] = useState<ChangePasswordInput>(emptyPassword)
  const [saving, setSaving] = useState(false)
  const invalidLength = form.new_password.length > 0 && !hasRequiredPassword(form.new_password)
  const mismatch = form.confirm_password.length > 0 && form.new_password !== form.confirm_password
  const unchanged = form.new_password.length > 0 && form.current_password === form.new_password
  const invalid =
    !form.current_password ||
    !form.new_password ||
    !form.confirm_password ||
    invalidLength ||
    mismatch ||
    unchanged

  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasRequiredPassword(form.new_password)) {
      toast.error('New password must have at least 8 characters and no more than 72 bytes UTF-8')
      return
    }
    if (form.new_password !== form.confirm_password) {
      toast.error('The new passwords do not match')
      return
    }
    if (form.current_password === form.new_password) {
      toast.error('The new password must differ from the current password')
      return
    }
    setSaving(true)
    try {
      const response = await changePassword(form.current_password, form.new_password)
      setForm(emptyPassword)
      toast[response.success ? 'success' : 'error'](response.message || 'Password changed')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not change password'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card asChild>
      <form className="mt-4 p-6" onSubmit={submit}>
        <CardHeader className="mb-6 p-0">
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Enter your current password to set a new sign-in password.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <FormLabel htmlFor="current-password" required>
              Current password
            </FormLabel>
            <PasswordInput
              id="current-password"
              name="current_password"
              value={form.current_password}
              onChange={update}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel htmlFor="new-password" required>
              New password
            </FormLabel>
            <PasswordInput
              id="new-password"
              name="new_password"
              value={form.new_password}
              onChange={update}
              autoComplete="new-password"
              minLength={8}
              aria-invalid={invalidLength || unchanged}
              required
            />
            {invalidLength ? (
              <small className="mt-1 text-xs font-semibold text-destructive">
                New password must have at least 8 characters and no more than 72 bytes UTF-8
              </small>
            ) : (
              <small className="text-xs text-muted-foreground">
                must have at least 8 characters
              </small>
            )}
            {unchanged && (
              <small className="mt-1 text-xs font-semibold text-destructive">
                The new password must differ from the current password
              </small>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel htmlFor="confirm-password" required>
              Confirm new password
            </FormLabel>
            <PasswordInput
              id="confirm-password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={update}
              autoComplete="new-password"
              minLength={8}
              aria-invalid={mismatch}
              required
            />
            {mismatch && (
              <small className="mt-1 text-xs font-semibold text-destructive">
                The new passwords do not match
              </small>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Button className="min-h-10 w-full sm:w-auto" type="submit" disabled={saving || invalid}>
            {saving ? 'Changing password…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
