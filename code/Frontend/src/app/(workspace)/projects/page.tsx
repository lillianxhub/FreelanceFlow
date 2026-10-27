'use client'
import Screen from '../../../ProjectManagement/pages/Projects/page'
import { ProjectsProvider } from '../../../ProjectManagement/ProjectsContext'
export default function Page() {
  return (
    <ProjectsProvider>
      <Screen />
    </ProjectsProvider>
  )
}
