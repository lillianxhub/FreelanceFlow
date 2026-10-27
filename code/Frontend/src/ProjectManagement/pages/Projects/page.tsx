import { DEFAULT_RECORD_COLOR } from '../../../constants/colors'
import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { NativeSelect } from '../../../components/ui/native-select'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { FiBriefcase, FiPlus } from 'react-icons/fi'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../../components/ui/sheet'
import PageHeader from '../../../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ViewState'
import { useProjects } from '../../useProjects'
import type { Project } from '../../../types/project'
import type { ProjectStatus } from '../../../types/project'
import type { ProjectDraft, ProjectFilter, ProjectSort } from '../../../types/projectsPage'
import ProjectForm from '../../components/ProjectForm'
import ProjectCard from '../../components/ProjectCard'
import FilterBar from '../../../components/FilterBar'
import { getErrorMessage } from '../../../api/apiError'
import { changeProjectStatus } from '../../../services/project'
import { listProjectsPage, type ProjectListFilters } from '../../../services/project'
import type { NotificationMessage } from '../../../types/notification'
import { toast } from 'sonner'
import type { ApiMeta } from '../../../types/api'
import PaginationControls from '../../../components/PaginationControls'

const emptyForm: ProjectDraft = {
  name: '',
  client_id: '',
  description: '',
  color: DEFAULT_RECORD_COLOR,
  status: 'PLANNED',
  billing_type: 'HOURLY',
  hourly_rate: 850,
  fixed_price: '',
  budget_hours: 40,
  budget_amount: '',
  currency: 'THB',
  start_date: '',
  end_date: '',
}

const projectPageLimit = 10

const projectSortParams: Record<ProjectSort, Pick<ProjectListFilters, 'sortBy' | 'direction'>> = {
  UPDATED_DESC: { sortBy: 'update_at', direction: 'DESC' },
  NAME_ASC: { sortBy: 'project_name', direction: 'ASC' },
  END_ASC: { sortBy: 'end_date', direction: 'ASC' },
}

function ProjectsPage() {
  const { data, loading, error, refresh, saveProject } = useProjects()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState('ALL')
  const [status, setStatus] = useState<ProjectFilter>('ALL')
  const [sortBy, setSortBy] = useState<ProjectSort>('UPDATED_DESC')
  const [page, setPage] = useState(1)
  const [pageRequestKey, setPageRequestKey] = useState(0)
  const [pageResult, setPageResult] = useState<{
    key: string
    projects: Project[]
    meta: ApiMeta
    error: string
  } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [dateErrors, setDateErrors] = useState<Partial<Record<'start_date' | 'end_date', string>>>(
    {},
  )
  const [saving, setSaving] = useState(false)
  const [changingProjectId, setChangingProjectId] = useState<string | null>(null)
  const showToast = ({ success, message }: NotificationMessage) => {
    toast[success ? 'success' : 'error'](message)
  }
  const pageQueryKey = JSON.stringify([page, clientId, query, status, sortBy, pageRequestKey])
  const currentPageResult = pageResult?.key === pageQueryKey ? pageResult : null
  const pageProjects = currentPageResult?.projects ?? []
  const pageMeta = currentPageResult?.meta ?? {
    page: 1,
    limit: projectPageLimit,
    total: 0,
    totalPages: 1,
  }
  const pageLoading = !currentPageResult
  const pageError = currentPageResult?.error ?? ''

  useEffect(() => {
    let active = true
    listProjectsPage(page, projectPageLimit, {
      clientId: clientId === 'ALL' ? undefined : clientId,
      search: query,
      status,
      ...projectSortParams[sortBy],
    })
      .then((result) => {
        if (!active) return
        if (page > Math.max(1, result.meta.totalPages)) {
          setPage(Math.max(1, result.meta.totalPages))
          return
        }
        setPageResult({
          key: pageQueryKey,
          projects: result.projects,
          meta: result.meta,
          error: '',
        })
      })
      .catch((loadError: unknown) => {
        if (active)
          setPageResult({
            key: pageQueryKey,
            projects: [],
            meta: { page, limit: projectPageLimit, total: 0, totalPages: 1 },
            error: getErrorMessage(loadError, 'Could not load project'),
          })
      })
    return () => {
      active = false
    }
  }, [clientId, page, pageQueryKey, query, sortBy, status])

  const projects = pageProjects
  const totalPages = Math.max(1, pageMeta.totalPages)
  const safePage = Math.min(pageMeta.page, totalPages)

  const openCreate = () => {
    setForm({
      ...emptyForm,
      client_id: data.clients.find((client) => client.status === 'ACTIVE')?.id || '',
    })
    setFormError('')
    setDateErrors({})
    setModalOpen(true)
  }

  const openEdit = (project: Project) => {
    setForm({
      ...emptyForm,
      ...project,
      hourly_rate: project.hourly_rate ?? '',
      fixed_price: project.fixed_price ?? '',
      budget_hours: project.budget_hours ?? '',
      budget_amount: project.budget_amount ?? '',
    })
    setFormError('')
    setDateErrors({})
    setModalOpen(true)
  }

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'start_date' || name === 'end_date') {
      setDateErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // if (form.billing_type === "HOURLY" && Number(form.hourly_rate) <= 0) {
    //   setFormError("Hourly projects need a rate above 0");
    //   return;
    // }
    // if (form.billing_type === "FIXED_PRICE" && Number(form.fixed_price) <= 0) {
    //   setFormError("Fixed-price projects need a value above 0");
    //   return;
    // }
    const nextDateErrors: Partial<Record<'start_date' | 'end_date', string>> = {}
    if (!form.start_date) nextDateErrors.start_date = 'Select a start date'
    if (!form.end_date) nextDateErrors.end_date = 'Select an end date'
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      nextDateErrors.end_date = 'End date must be on or after start date'
    }
    setDateErrors(nextDateErrors)
    const missingProjectInfo = !form.name.trim() || !form.client_id
    setFormError(missingProjectInfo ? 'Enter a project and client name' : '')
    if (missingProjectInfo || Object.keys(nextDateErrors).length > 0) {
      return
    }

    setSaving(true)
    setFormError('')
    try {
      await saveProject({
        ...form,
        name: form.name.trim(),
        hourly_rate: form.billing_type === 'HOURLY' ? Number(form.hourly_rate) : null,
        fixed_price: form.billing_type === 'FIXED_PRICE' ? Number(form.fixed_price) : null,
        budget_hours: form.budget_hours === '' ? null : Number(form.budget_hours),
        budget_amount: form.budget_amount === '' ? null : Number(form.budget_amount),
      })
      setModalOpen(false)
      if (page === 1) setPageRequestKey((current) => current + 1)
      else setPage(1)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save project'))
    } finally {
      setSaving(false)
    }
  }

  const updateProjectStatus = async (project: Project, nextStatus: ProjectStatus) => {
    if (nextStatus === project.status) return
    setChangingProjectId(project.id)
    try {
      await changeProjectStatus(project.id, nextStatus)
      setPageRequestKey((current) => current + 1)
      showToast({ success: true, message: 'Project status updated' })
    } catch (statusError) {
      showToast({
        success: false,
        message: getErrorMessage(statusError, 'Could not update project status'),
      })
    } finally {
      setChangingProjectId(null)
    }
  }

  if (loading || pageLoading) return <LoadingState label="Loading projects…" />
  if (error || pageError) {
    return (
      <ErrorState
        message={error || pageError}
        onRetry={async () => {
          await refresh()
          setPageRequestKey((current) => current + 1)
        }}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <PageHeader
        title="Your projects"
        actions={
          <Button variant="default" className="h-10" type="button" onClick={openCreate}>
            <FiPlus aria-hidden="true" /> Add project
          </Button>
        }
      />

      <FilterBar
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        onSearch={() => {
          setQuery(searchInput.trim())
          setPage(1)
        }}
        placeholder="Search projects or clients"
        searchAriaLabel="Search projects or clients"
      >
        <NativeSelect
          value={clientId}
          onChange={(event) => {
            setClientId(event.target.value)
            setPage(1)
          }}
          aria-label="Filter by client"
        >
          <option value="ALL">All clients</option>
          {data.clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProjectFilter)
            setPage(1)
          }}
        >
          <option value="ALL">All statuses</option>
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">In progress</option>
          <option value="ON_HOLD">On hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </NativeSelect>
        <NativeSelect
          value={sortBy}
          onChange={(event) => {
            setSortBy(event.target.value as ProjectSort)
            setPage(1)
          }}
        >
          <option value="UPDATED_DESC">Recently updated</option>
          <option value="NAME_ASC">Name A–Z</option>
          <option value="END_ASC">Due soonest</option>
        </NativeSelect>
      </FilterBar>

      {projects.length === 0 ? (
        <Card asChild>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-soft ring-0">
            <EmptyState
              icon={<FiBriefcase aria-hidden="true" />}
              title="No projects found"
              description="Create your first project or change the filters."
              action={
                <Button variant="default" className="h-10" type="button" onClick={openCreate}>
                  Add project
                </Button>
              }
            />
          </section>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {projects.map((project) => {
            const client = data.clients.find((item) => item.id === project.client_id)
            const clientName =
              project.client_name || client?.company_name || client?.name || 'Client not found'
            return (
              <ProjectCard
                key={project.id}
                project={project}
                clientName={clientName}
                changing={changingProjectId === project.id}
                onEdit={openEdit}
                onStatusChange={(nextProject, status) => {
                  void updateProjectStatus(nextProject, status)
                }}
              />
            )
          })}
        </div>
      )}

      <PaginationControls
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        className="mt-6"
      />

      <Sheet
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) setModalOpen(false)
        }}
      >
        <SheetContent className="!w-full !max-w-full overflow-y-auto p-4 sm:!w-[640px] sm:!max-w-[640px] sm:p-6">
          <SheetHeader className="p-0 pr-10">
            <SheetTitle>{form.id ? 'Edit project' : 'Add project'}</SheetTitle>
          </SheetHeader>
          <ProjectForm
            value={form}
            clients={data.clients}
            error={formError}
            dateErrors={dateErrors}
            saving={saving}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default ProjectsPage
