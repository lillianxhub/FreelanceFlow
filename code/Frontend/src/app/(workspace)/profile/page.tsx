'use client'
import Screen from '../../../Profile/pages/Profile/page'
import { ProfileProvider } from '../../../Profile/ProfileContext'
export default function Page() {
  return (
    <ProfileProvider>
      <Screen />
    </ProfileProvider>
  )
}
