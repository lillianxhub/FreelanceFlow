'use client'
import Screen from '../../../../ProjectManagement/pages/ProjectDetail/page'
import { ProjectsProvider } from '../../../../ProjectManagement/ProjectsContext'
import { useParams } from 'next/navigation'
export default function Page() {
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <ProjectsProvider projectId={projectId}>
      <Screen />
    </ProjectsProvider>
  )
}
