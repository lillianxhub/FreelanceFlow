'use client'
/* eslint-disable react-hooks/preserve-manual-memoization -- projectId is an immutable search-param string for each render. */

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TodayPlanner from '../../../components/TodayPlanner'
import ProjectBoard from '../../../ProjectManagement/components/ProjectBoard'
import { listTimerProjects, listTimerTasks } from '../../../services/timerOptions'
import { getErrorMessage } from '../../../api/apiError'
import { useCurrentTimer } from '../../../TimeTracking/useCurrentTimer'
import { formatTimer } from '../../../utils/duration'
import type { Project } from '../../../types/project'
import type { Task } from '../../../types/task'

export default function TaskBoardPage() {
  const router = useRouter()
  const params = useSearchParams()
  const tab = params.get('tab') === 'kanban' ? 'kanban' : 'today'
  const projectId = params.get('projectId') ?? ''
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { currentTimer } = useCurrentTimer()
  const running = currentTimer?.running ? currentTimer.timeEntry : null

  const navigate = (nextTab: 'today' | 'kanban', nextProjectId = projectId) => {
    const query = new URLSearchParams({ tab: nextTab })
    if (nextProjectId) query.set('projectId', nextProjectId)
    router.push(`/task-board?${query}`)
  }
  useEffect(() => {
    let live = true
    void listTimerProjects()
      .then((result) => {
        if (live) setProjects(result)
      })
      .catch((reason: unknown) => {
        if (live) setError(getErrorMessage(reason, 'Could not load projects'))
      })
    return () => {
      live = false
    }
  }, [])
  const refresh = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      setTasks(await listTimerTasks(projectId))
      setError('')
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Could not load tasks'))
    } finally {
      setLoading(false)
    }
  }, [projectId])
  useEffect(() => {
    if (tab === 'kanban') queueMicrotask(() => void refresh())
  }, [tab, refresh])
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [running])

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold">Task Board</h1>
          <p className="text-sm text-text-secondary">Plan your day and move work forward.</p>
        </div>
        {running && (
          <div
            className="rounded-lg border border-primary/20 bg-primary-soft px-4 py-2 text-sm"
            aria-live="polite"
          >
            <strong>{running.task?.title ?? running.project.name}</strong> ·{' '}
            {formatTimer(Math.max(0, Math.floor((now - Date.parse(running.startedAt)) / 1000)))}
          </div>
        )}
      </header>
      <nav aria-label="Task Board views" className="flex gap-2 border-b border-border">
        {(['today', 'kanban'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => navigate(view)}
            aria-current={tab === view ? 'page' : undefined}
            className={`min-h-11 border-b-2 px-4 font-semibold ${tab === view ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}
          >
            {view === 'today' ? 'Today' : 'Kanban'}
          </button>
        ))}
      </nav>
      {tab === 'today' ? (
        <TodayPlanner />
      ) : (
        <section className="space-y-4">
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            Project
            <select
              aria-label="Project"
              value={projectId}
              onChange={(event) => navigate('kanban', event.target.value)}
              className="min-h-10 min-w-56 rounded-lg border border-border bg-surface px-3"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-destructive">
              {error}{' '}
              <button type="button" onClick={() => void refresh()} className="underline">
                Retry
              </button>
            </p>
          )}
          {loading && <p>Loading tasks…</p>}
          {projectId && !loading && (
            <ProjectBoard
              projectId={projectId}
              tasks={tasks}
              onChanged={refresh}
              readOnly={projects.find((project) => project.id === projectId)?.status !== 'ACTIVE'}
            />
          )}
          {!projectId && (
            <p className="rounded-lg border border-border bg-surface p-8 text-text-secondary">
              Select a project to view its board.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
