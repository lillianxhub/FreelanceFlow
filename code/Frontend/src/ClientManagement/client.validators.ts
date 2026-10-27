import type { ClientInput } from '../types/client'
import { isValidEmail, isValidPhone } from '../Authentication/authentication.validators'
import type { ClientFieldErrors, ClientFieldName } from '../types/clientsPage'

export function normalizeDigits(value: string, maximumLength: number): string {
  return value.replace(/\D/g, '').slice(0, maximumLength)
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isRequired(value: unknown): boolean {
  return toText(value).trim().length > 0
}

export function validateClientField(
  field: ClientFieldName,
  client: ClientInput,
): string | undefined {
  const value = toText(client[field])

  if (!isRequired(value)) return 'Complete this field'
  if (field === 'email' && !isValidEmail(toText(client.email))) return 'Enter a valid email address'
  if (field === 'phone' && !isValidPhone(toText(client.phone)))
    return 'Enter a phone number 10 Main'
  if (field === 'postal_code' && !/^\d{5}$/.test(toText(client.postal_code)))
    return 'Select a postal code 5 Main'
  if (field === 'tax_id' && !/^\d{13}$/.test(toText(client.tax_id))) return 'Enter a tax ID 13 Main'

  return undefined
}

export function validateClientFields(client: ClientInput): ClientFieldErrors {
  const fields: ClientFieldName[] = [
    'name',
    'company_name',
    'email',
    'phone',
    'address',
    'province',
    'district',
    'sub_district',
    'postal_code',
    'tax_id',
    'status',
  ]

  return fields.reduce<ClientFieldErrors>((errors, field) => {
    const error = validateClientField(field, client)
    if (error) errors[field] = error
    return errors
  }, {})
}

export function validateClient(client: ClientInput): string | null {
  const name = toText(client.name)
  const companyName = toText(client.company_name)
  const email = toText(client.email)

  if (!name.trim() && !companyName.trim()) return 'Enter a contact or company name'
  if (email && !isValidEmail(email)) return 'Invalid email format'
  return null
}
