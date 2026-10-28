import type { ChangeEvent, FormEvent } from 'react'
import { Card } from '../../components/ui/card'
import { NativeSelect } from '../../components/ui/native-select'
import { Button } from '../../components/ui/button'
import FormLabel from '../../components/FormLabel'
import { Input } from '../../components/ui/input'
import type { Profile, ProfileFieldErrors, ProfileInput } from '../../types/profile'
import type { FieldErrorProps } from '../../types/ui'
import type { ThaiProvince } from '../../services/thaiAddress'

function FieldError({ id, message }: FieldErrorProps) {
  return message ? (
    <p id={id} className="mt-1 text-xs font-semibold text-destructive">
      {message}
    </p>
  ) : null
}

type Props = {
  profile: Profile | ProfileInput
  errors: ProfileFieldErrors
  provinces: ThaiProvince[]
  addressLoading: boolean
  addressError: string
  saving: boolean
  hasChanges: boolean
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onFieldsChange: (values: Partial<ProfileInput>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function ProfileDetailsForm({
  profile,
  errors,
  provinces,
  addressLoading,
  addressError,
  saving,
  hasChanges,
  onChange: update,
  onFieldsChange,
  onSubmit,
  onCancel,
}: Props) {
  const selectedProvince = provinces.find((item) => item.name_th === profile.province)
  const districts = selectedProvince?.districts || []
  const selectedDistrict = districts.find((item) => item.name_th === profile.district)
  const subDistricts = selectedDistrict?.sub_districts || []
  const selectedSubDistrict = subDistricts.find((item) => item.name_th === profile.sub_district)
  const updateDigits = (maxLength: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    onFieldsChange({ [name]: value.replace(/\D/g, '').slice(0, maxLength) })
  }
  const updateProvince = (event: ChangeEvent<HTMLSelectElement>) => {
    onFieldsChange({
      province: event.target.value,
      district: '',
      sub_district: '',
      postal_code: '',
    })
  }
  const updateDistrict = (event: ChangeEvent<HTMLSelectElement>) => {
    onFieldsChange({ district: event.target.value, sub_district: '', postal_code: '' })
  }
  const updateSubDistrict = (event: ChangeEvent<HTMLSelectElement>) => {
    const subDistrict = subDistricts.find((item) => item.name_th === event.target.value)
    onFieldsChange({
      sub_district: event.target.value,
      postal_code: subDistrict ? String(subDistrict.zip_code) : '',
    })
  }
  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      <Card asChild>
        <section className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-full flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-display-name" required>
                Display name
              </FormLabel>
              <Input
                id="profile-display-name"
                name="display_name"
                value={profile.display_name || ''}
                onChange={update}
                aria-invalid={Boolean(errors.display_name)}
                aria-describedby={errors.display_name ? 'profile-display-name-error' : undefined}
                required
              />
              <FieldError id="profile-display-name-error" message={errors.display_name} />
              <small className="text-xs text-muted-foreground">
                This name appears across your workspace and account menu.
              </small>
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-first-name" required>
                Name
              </FormLabel>
              <Input
                id="profile-first-name"
                name="first_name"
                value={profile.first_name || ''}
                onChange={update}
                aria-invalid={Boolean(errors.first_name)}
                aria-describedby={errors.first_name ? 'profile-first-name-error' : undefined}
                required
              />
              <FieldError id="profile-first-name-error" message={errors.first_name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-last-name" required>
                Last name
              </FormLabel>
              <Input
                id="profile-last-name"
                name="last_name"
                value={profile.last_name || ''}
                onChange={update}
                aria-invalid={Boolean(errors.last_name)}
                aria-describedby={errors.last_name ? 'profile-last-name-error' : undefined}
                required
              />
              <FieldError id="profile-last-name-error" message={errors.last_name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-email">Account email</FormLabel>
              <Input
                id="profile-email"
                name="email"
                type="email"
                value={profile.email || ''}
                disabled
                aria-disabled="true"
              />
              <small className="text-xs text-muted-foreground">Use this email to sign in.</small>
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-phone" required>
                Phone number
              </FormLabel>
              <Input
                id="profile-phone"
                name="phone"
                value={profile.phone || ''}
                onChange={updateDigits(10)}
                inputMode="numeric"
                pattern="[0-9]{0,10}"
                maxLength={10}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
              />
              <FieldError id="profile-phone-error" message={errors.phone} />
              <small className="text-xs text-muted-foreground">Enter no more than 10 Main</small>
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-tax">Tax ID</FormLabel>
              <Input
                id="profile-tax"
                name="tax_id"
                value={profile.tax_id || ''}
                onChange={updateDigits(13)}
                inputMode="numeric"
                pattern="[0-9]{0,13}"
                maxLength={13}
                aria-invalid={Boolean(errors.tax_id)}
                aria-describedby={errors.tax_id ? 'profile-tax-error' : undefined}
              />
              <FieldError id="profile-tax-error" message={errors.tax_id} />
              <small className="text-xs text-muted-foreground">Enter no more than 13 Main</small>
            </div>
          </div>

          <div className="my-6 border-t border-border" />
          <p className="mb-3 text-sm font-semibold tracking-wide text-text-secondary">Address</p>
          {addressError && (
            <p className="rounded-lg bg-red-soft px-3 py-2 text-sm text-destructive">
              {addressError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="col-span-full flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-address" required>
                Address
              </FormLabel>
              <Input
                id="profile-address"
                name="address"
                value={profile.address || ''}
                onChange={update}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? 'profile-address-error' : undefined}
              />
              <FieldError id="profile-address-error" message={errors.address} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-province" required>
                Province
              </FormLabel>
              <NativeSelect
                id="profile-province"
                value={profile.province || ''}
                onChange={updateProvince}
                disabled={addressLoading || Boolean(addressError)}
                aria-invalid={Boolean(errors.province)}
                aria-describedby={errors.province ? 'profile-province-error' : undefined}
              >
                <option value="">
                  {addressLoading ? 'Loading provinces…' : 'Select province'}
                </option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.name_th}>
                    {province.name_th}
                  </option>
                ))}
              </NativeSelect>
              <FieldError id="profile-province-error" message={errors.province} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-district" required>
                District
              </FormLabel>
              <NativeSelect
                id="profile-district"
                value={profile.district || ''}
                onChange={updateDistrict}
                disabled={!selectedProvince}
                aria-invalid={Boolean(errors.district)}
                aria-describedby={errors.district ? 'profile-district-error' : undefined}
              >
                <option value="">Select district</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.name_th}>
                    {district.name_th}
                  </option>
                ))}
              </NativeSelect>
              <FieldError id="profile-district-error" message={errors.district} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-sub-district" required>
                Subdistrict
              </FormLabel>
              <NativeSelect
                id="profile-sub-district"
                value={profile.sub_district || ''}
                onChange={updateSubDistrict}
                disabled={!selectedDistrict}
                aria-invalid={Boolean(errors.sub_district)}
                aria-describedby={errors.sub_district ? 'profile-sub-district-error' : undefined}
              >
                <option value="">Select subdistrict</option>
                {subDistricts.map((subDistrict) => (
                  <option key={subDistrict.id} value={subDistrict.name_th}>
                    {subDistrict.name_th}
                  </option>
                ))}
              </NativeSelect>
              <FieldError id="profile-sub-district-error" message={errors.sub_district} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="profile-postal-code" required>
                Postal code
              </FormLabel>
              <NativeSelect
                id="profile-postal-code"
                name="postal_code"
                value={profile.postal_code || ''}
                disabled={!selectedSubDistrict}
                onChange={update}
                aria-invalid={Boolean(errors.postal_code)}
                aria-describedby={errors.postal_code ? 'profile-postal-code-error' : undefined}
              >
                <option value="">Select a subdistrict first</option>
                {selectedSubDistrict && (
                  <option value={String(selectedSubDistrict.zip_code)}>
                    {selectedSubDistrict.zip_code}
                  </option>
                )}
              </NativeSelect>
              <FieldError id="profile-postal-code-error" message={errors.postal_code} />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="min-h-10 w-full sm:w-auto"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="min-h-10 w-full sm:w-auto"
              type="submit"
              disabled={saving || !hasChanges}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </section>
      </Card>
    </form>
  )
}
