'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { getErrorMessage } from '../api/apiError'
import { AvailableTask, PlanRow, TodayDrop } from './TodayPlannerParts'
import { startTimer, stopTimer } from '../services/timeTracking'
import { useCurrentTimer } from '../TimeTracking/useCurrentTimer'
import { listTimerProjects } from '../services/timerOptions'
import {
  bangkokDate,
  getDailyPlan,
  getPreviousPlan,
  saveDailyPlan,
  searchPlanTasks,
  type DailyPlan,
  type PlannedTask,
  type TaskPage,
} from '../services/dailyPlan'

export default function TodayPlanner() {
  const { currentTimer, refreshCurrentTimer } = useCurrentTimer()
  const [date, setDate] = useState(bangkokDate)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [previous, setPrevious] = useState<DailyPlan | null>(null)
  const [results, setResults] = useState<TaskPage | null>(null)
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [timerBusy, setTimerBusy] = useState(false)
  const runningId = currentTimer?.running ? currentTimer.timeEntry?.task?.id : undefined
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const refresh = useCallback(async () => {
    const [today, earlier] = await Promise.all([getDailyPlan(date), getPreviousPlan(date)])
    setPlan(today)
    setPrevious(earlier)
  }, [date])
  useEffect(() => {
    queueMicrotask(() => {
      void refresh().catch((error: unknown) =>
        toast.error(getErrorMessage(error, 'Could not load today tasks')),
      )
    })
  }, [refresh])
  useEffect(() => {
    void listTimerProjects()
      .then(setProjects)
      .catch(() => {})
  }, [])
  useEffect(() => {
    let live = true
    void searchPlanTasks(search, projectId, page)
      .then((data) => {
        if (live) setResults(data)
      })
      .catch(() => {
        if (live) setResults(null)
      })
    return () => {
      live = false
    }
  }, [search, projectId, page])
  useEffect(() => {
    const timer = window.setInterval(() => {
      const today = bangkokDate()
      if (today !== date) setDate(today)
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [date])
  const persist = async (ids: string[]) => {
    if (!plan || busy) return
    setBusy(true)
    try {
      setPlan(await saveDailyPlan(plan, ids))
      setPrevious(await getPreviousPlan(date))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Could not save today tasks'))
      await refresh()
    } finally {
      setBusy(false)
    }
  }
  const add = (task: PlannedTask) => {
    if (plan && !plan.tasks.some((item) => item.id === task.id))
      void persist([...plan.tasks.map((item) => item.id), task.id])
  }
  const toggleTimer = async (task: PlannedTask) => {
    if (timerBusy || !task.available || task.status === 'COMPLETED') return
    const active = currentTimer?.running
    const same = active && runningId === task.id
    if (active && !same && !window.confirm('Stop and save the current task, then start this task?'))
      return
    setTimerBusy(true)
    try {
      if (same) await stopTimer()
      else
        await startTimer({
          projectId: task.projectId,
          taskId: task.id,
          stopCurrentTimer: Boolean(active),
        })
      await refreshCurrentTimer()
      await refresh()
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, 'Could not update the timer'))
      await refreshCurrentTimer()
      await refresh()
    } finally {
      setTimerBusy(false)
    }
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !plan) return
    const source = String(active.id),
      target = String(over.id)
    if (source.startsWith('pool:') && (target === 'today' || target.startsWith('plan:'))) {
      const task = results?.tasks.find((item) => item.id === source.slice(5))
      if (task) add(task)
    } else if (source.startsWith('plan:') && target.startsWith('plan:') && source !== target) {
      const ids = plan.tasks.map((item) => item.id)
      void persist(arrayMove(ids, ids.indexOf(source.slice(5)), ids.indexOf(target.slice(5))))
    }
  }
  const todayIds = plan?.tasks.map((task) => task.id) ?? []
  const carry =
    previous?.tasks.filter((task) => task.available && !todayIds.includes(task.id)) ?? []
  return (
    <section className="mx-auto mb-7 w-full max-w-screen-2xl space-y-4" aria-label="Today's tasks">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Today</h1>
        <p className="text-sm text-text-secondary">
          Choose tasks and drag them into your preferred order before tracking time
        </p>
      </header>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,.75fr)]">
          <TodayDrop>
            <SortableContext
              items={todayIds.map((id) => `plan:${id}`)}
              strategy={verticalListSortingStrategy}
            >
              {plan?.tasks.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="border-b border-border bg-surface-soft text-xs text-text-secondary">
                      <tr>
                        <th className="p-3">Drag</th>
                        <th className="p-3">Order</th>
                        <th className="p-3">Tasks</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.tasks.map((task, index) => (
                        <PlanRow
                          key={task.id}
                          task={task}
                          index={index}
                          count={plan.tasks.length}
                          onMove={(offset) =>
                            void persist(arrayMove(todayIds, index, index + offset))
                          }
                          onRemove={() => void persist(todayIds.filter((id) => id !== task.id))}
                          running={runningId === task.id}
                          onTimer={() => void toggleTimer(task)}
                          busy={timerBusy}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-8 text-center text-sm text-text-secondary">
                  No tasks planned today. Drag or add one from the list.
                </p>
              )}
            </SortableContext>
          </TodayDrop>
          <div className="rounded-xl border border-border bg-surface">
            <div className="space-y-2 border-b border-border p-3">
              <h2 className="font-semibold">Choose tasks</h2>
              <input
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search tasks"
                aria-label="Search tasks"
              />
              <select
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                value={projectId}
                onChange={(event) => {
                  setProjectId(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by project"
              >
                <option value="">All projects</option>
                {projects
                  .filter((project) => project.id)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {results?.tasks.map((task) => (
                <AvailableTask
                  key={task.id}
                  task={task}
                  disabled={busy || todayIds.includes(task.id)}
                  onAdd={() => add(task)}
                />
              ))}
              {!results?.tasks.length && (
                <p className="p-4 text-sm text-text-secondary">No available tasks found</p>
              )}
            </div>
            <div className="flex justify-between border-t border-border p-3 text-xs">
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>Page {page}</span>
              <button
                type="button"
                disabled={!results || page * results.limit >= results.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </DndContext>
      {carry.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 font-semibold">Open tasks from previous day</h2>
          <div className="space-y-2">
            {carry.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {task.name} <small className="text-text-secondary">{task.projectName}</small>
                </span>
                <button
                  type="button"
                  onClick={() => add(task)}
                  className="rounded border border-border px-3 py-1"
                >
                  Carry into today
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
