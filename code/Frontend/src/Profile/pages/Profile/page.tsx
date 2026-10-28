import { useState, type ChangeEvent, type FormEvent } from 'react'
import PageHeader from '../../../components/PageHeader'
import { ErrorState, LoadingState } from '../../../components/ViewState'
import { useProfile } from '../../useProfile'
import type { Profile, ProfileFieldErrors } from '../../../types/profile'
import type { ProfileInput } from '../../../types/profile'
import type { NotificationMessage } from '../../../types/notification'
import { toast } from 'sonner'
import { getErrorMessage } from '../../../api/apiError'
import { validateProfileFields } from '../../profile.validators'
import { useThaiAddress } from '../../useThaiAddress'
import { ChangePasswordForm } from '../../components/ChangePasswordForm'
import { ProfileDetailsForm } from '../../components/ProfileDetailsForm'

const emptyProfile: ProfileInput = {
  full_name: '',
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  postal_code: '',
  province: '',
  district: '',
  sub_district: '',
  tax_id: '',
  logo_url: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  timezone: 'Asia/Bangkok',
  currency: 'THB',
  default_tax_rate: 0,
  default_hourly_rate: 0,
  bio: '',
}

const editableProfileFields: Array<keyof ProfileInput> = [
  'display_name',
  'first_name',
  'last_name',
  'phone',
  'tax_id',
  'address',
  'province',
  'district',
  'sub_district',
  'postal_code',
]

function fieldValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function ProfilePage() {
  const { data, loading, error, refresh, updateProfile } = useProfile()
  const [draft, setDraft] = useState<Profile | ProfileInput | null>(null)
  const showToast = ({ success, message }: NotificationMessage) => {
    toast[success ? 'success' : 'error'](message)
  }
  const [saving, setSaving] = useState(false)
  const { provinces, loading: addressLoading, error: addressError } = useThaiAddress()
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({})

  if (loading) return <LoadingState label="Loading profile…" />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  const profile = draft || data || emptyProfile
  const savedProfile = data || emptyProfile
  const hasProfileChanges =
    draft !== null &&
    editableProfileFields.some(
      (field) => fieldValue(profile[field]) !== fieldValue(savedProfile[field]),
    )

  const updateFields = (values: Partial<ProfileInput>) => {
    setDraft((current) => ({
      ...(current || data || emptyProfile),
      ...values,
    }))
  }

  const update = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setDraft((current) => ({
      ...(current || data || emptyProfile),
      [name]: value,
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateProfileFields(profile)
    setProfileErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setSaving(true)
    try {
      const response = await updateProfile({
        ...profile,
        default_tax_rate: Number(profile.default_tax_rate) || 0,
        default_hourly_rate: Number(profile.default_hourly_rate) || 0,
      })
      await refresh()
      setDraft(null)
      showToast({
        success: response.success,
        message: response.message || 'Profile saved',
      })
    } catch (err) {
      showToast({
        success: false,
        message: getErrorMessage(err, 'Could not save profile'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <PageHeader title="Personal information" />

      <ProfileDetailsForm
        profile={profile}
        errors={profileErrors}
        provinces={provinces}
        addressLoading={addressLoading}
        addressError={addressError}
        saving={saving}
        hasChanges={hasProfileChanges}
        onChange={update}
        onFieldsChange={updateFields}
        onSubmit={submit}
        onCancel={() => setDraft(null)}
      />

      <ChangePasswordForm />
    </div>
  )
}

export default ProfilePage
