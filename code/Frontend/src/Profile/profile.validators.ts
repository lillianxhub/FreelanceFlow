import { isValidPhone } from '../Authentication/authentication.validators'
import type { Profile, ProfileFieldErrors, ProfileFieldName } from '../types/profile'

const requiredFields: Exclude<ProfileFieldName, 'tax_id'>[] = [
  'display_name',
  'first_name',
  'last_name',
  'phone',
  'address',
  'province',
  'district',
  'sub_district',
  'postal_code',
]

export function validateProfileField(
  field: ProfileFieldName,
  profile: Pick<Profile, ProfileFieldName>,
): string | undefined {
  const value = profile[field].trim()
  if (field !== 'tax_id' && !value) return 'Complete this field'
  if (field === 'phone' && !isValidPhone(profile.phone)) return 'Enter a phone number 10 Main'
  if (field === 'postal_code' && !/^\d{5}$/.test(profile.postal_code))
    return 'Select a postal code 5 Main'
  if (field === 'tax_id' && value && !/^\d{13}$/.test(profile.tax_id))
    return 'Enter a tax ID 13 Main'
  return undefined
}

export function validateProfileFields(
  profile: Pick<Profile, ProfileFieldName>,
): ProfileFieldErrors {
  const fields: ProfileFieldName[] = [...requiredFields, 'tax_id']
  return fields.reduce<ProfileFieldErrors>((errors, field) => {
    const error = validateProfileField(field, profile)
    if (error) errors[field] = error
    return errors
  }, {})
}
