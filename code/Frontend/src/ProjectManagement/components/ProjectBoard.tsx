/* eslint-disable react-hooks/refs -- dnd-kit exposes DOM bindings through hook return values. */
'use client'
import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { api } from '../../api/apiClient'
import { getErrorMessage } from '../../api/apiError'
import { startTimer, stopTimer } from '../../services/timeTracking'
import { reorderTask } from '../../services/task'
import { useCurrentTimer } from '../../TimeTracking/useCurrentTimer'
import type { Task, TaskStatus } from '../../types/task'

type Mode = 'AUTO' | 'MANUAL'
const columns: { status: TaskStatus; label: string }[] = [
  { status: 'OPEN', label: 'Open' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Done' },
]
function BoardCard({
  task,
  running,
  onMove,
  onStart,
  onStop,
  busy,
  readOnly,
}: {
  task: Task
  running: boolean
  onMove: (status: TaskStatus) => void
  onStart: () => void
  onStop: () => void
  busy: boolean
  readOnly: boolean
}) {
  const sortable = useSortable({ id: `task:${task.id}`, disabled: readOnly })
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className="rounded-lg border border-border bg-surface p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Drag ${task.name}`}
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab text-subtle"
          disabled={busy || readOnly}
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm">{task.name}</strong>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{task.description}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
        {running && (
          <span className="mr-auto rounded bg-primary-soft px-2 py-1 text-primary">
            ● Timer running
          </span>
        )}
        {task.status === 'OPEN' && (
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={() => onMove('IN_PROGRESS')}
            className="rounded border border-border px-2 py-1"
          >
            Start work
          </button>
        )}
        {task.status === 'IN_PROGRESS' && (
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={() => onMove('COMPLETED')}
            className="rounded border border-border px-2 py-1"
          >
            Done
          </button>
        )}
        {task.status === 'COMPLETED' && (
          <button
            type="button"
            disabled={busy || readOnly}
            onClick={() => onMove('IN_PROGRESS')}
            className="rounded border border-border px-2 py-1"
          >
            Resume
          </button>
        )}
        {task.status === 'IN_PROGRESS' &&
          (running ? (
            <button
              type="button"
              disabled={busy}
              onClick={onStop}
              className="rounded border border-border px-2 py-1"
            >
              Stop timer
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || readOnly}
              onClick={onStart}
              className="rounded border border-border px-2 py-1"
            >
              Track time
            </button>
          ))}
      </div>
    </div>
  )
}
function BoardColumn({
  status,
  label,
  tasks,
  runningId,
  busy,
  readOnly,
  onMove,
  onStart,
  onStop,
}: {
  status: TaskStatus
  label: string
  tasks: Task[]
  runningId?: string
  busy: boolean
  readOnly: boolean
  onMove: (task: Task, status: TaskStatus) => void
  onStart: (task: Task) => void
  onStop: () => void
}) {
  const drop = useDroppable({ id: `column:${status}` })
  return (
    <section
      ref={drop.setNodeRef}
      className={`min-h-44 rounded-xl border p-3 ${drop.isOver ? 'border-primary bg-primary-soft' : 'border-border bg-surface-soft'}`}
    >
      <h3 className="mb-3 flex justify-between text-sm font-semibold">
        {label}
        <span className="text-text-secondary">{tasks.length}</span>
      </h3>
      <SortableContext
        items={tasks.map((task) => `task:${task.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tasks.map((task) => (
            <BoardCard
              key={task.id}
              task={task}
              running={runningId === task.id}
              busy={busy}
              readOnly={readOnly}
              onMove={(next) => onMove(task, next)}
              onStart={() => onStart(task)}
              onStop={onStop}
            />
          ))}
          {!tasks.length && (
            <p className="py-8 text-center text-xs text-text-secondary">Drop a task here</p>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
export default function ProjectBoard({
  projectId,
  tasks,
  onChanged,
  readOnly = false,
}: {
  projectId: string
  tasks: Task[]
  onChanged: () => Promise<void>
  readOnly?: boolean
}) {
  const { currentTimer, refreshCurrentTimer } = useCurrentTimer()
  const [mode, setMode] = useState<Mode>('AUTO')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Task[] | null>(null)
  const current = preview ?? tasks
  const runningId = currentTimer?.running ? currentTimer.timeEntry?.task?.id : undefined
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  useEffect(() => {
    void api
      .get<{ boardTimerMode: Mode }>('/workspace/preferences')
      .then(({ data }) => setMode(data.boardTimerMode))
      .catch(() => {})
  }, [])
  const sync = async () => {
    await Promise.all([onChanged(), refreshCurrentTimer()])
    setPreview(null)
  }
  const move = async (task: Task, status: TaskStatus) => {
    if (busy || readOnly || status === task.status) return
    if (status === 'OPEN') {
      toast.error('A started task cannot return to Open.')
      return
    }
    const otherRunning = currentTimer?.running && currentTimer.timeEntry?.task?.id !== task.id
    const switchTimer = mode === 'AUTO' && status === 'IN_PROGRESS' && otherRunning
    if (switchTimer && !window.confirm('Stop and save the current task, then start this one?'))
      return
    setBusy(true)
    setPreview(current.map((item) => (item.id === task.id ? { ...item, status } : item)))
    try {
      await api.post(`/projects/${projectId}/tasks/${task.id}/workflow`, {
        status,
        version: task.version ?? 0,
        stopCurrentTimer: Boolean(switchTimer),
      })
      await sync()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Could not move task'))
      await sync()
    } finally {
      setBusy(false)
    }
  }
  const start = async (task: Task) => {
    if (busy || readOnly) return
    if (
      currentTimer?.running &&
      !window.confirm('Stop and save the current task, then start this task?')
    )
      return
    setBusy(true)
    try {
      await startTimer({
        projectId,
        taskId: task.id,
        description: '',
        stopCurrentTimer: Boolean(currentTimer?.running),
      })
      await sync()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Could not start timer'))
      await sync()
    } finally {
      setBusy(false)
    }
  }
  const stop = async () => {
    setBusy(true)
    try {
      await stopTimer()
      await sync()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Could not stop timer'))
      await sync()
    } finally {
      setBusy(false)
    }
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || busy || readOnly) return
    const task = current.find((item) => `task:${item.id}` === active.id)
    if (!task) return
    const target = String(over.id)
    const targetTask = current.find((item) => `task:${item.id}` === target)
    const next = target.startsWith('column:') ? (target.slice(7) as TaskStatus) : targetTask?.status
    if (next && next !== task.status) {
      void move(task, next)
      return
    }
    if (targetTask && targetTask.id !== task.id) {
      setBusy(true)
      void reorderTask(
        projectId,
        task.id,
        current.findIndex((item) => item.id === targetTask.id),
      )
        .then(sync)
        .catch(async (error: unknown) => {
          toast.error(getErrorMessage(error, 'Could not reorder tasks'))
          await sync()
        })
        .finally(() => setBusy(false))
    }
  }
  return (
    <div className="space-y-3">
      {readOnly && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface-soft p-3 text-sm text-text-secondary"
        >
          This project is not active. Task actions are unavailable.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          Drag tasks between columns or use the card buttons.
        </p>
        <label className="flex items-center gap-2 text-xs">
          When moving to In progress{' '}
          <select
            aria-label="Board timer mode"
            value={mode}
            onChange={(event) => {
              const next = event.target.value as Mode
              void api
                .patch<{ boardTimerMode: Mode }>('/workspace/preferences', { boardTimerMode: next })
                .then(() => setMode(next))
                .catch((error: unknown) =>
                  toast.error(getErrorMessage(error, 'Could not save preference')),
                )
            }}
            className="rounded border border-border bg-surface p-1"
          >
            <option value="AUTO">Automatic timer</option>
            <option value="MANUAL">Manual timer</option>
          </select>
        </label>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid gap-3 lg:grid-cols-3">
          {columns.map((column) => (
            <BoardColumn
              key={column.status}
              {...column}
              tasks={current.filter((task) => task.status === column.status)}
              runningId={runningId}
              busy={busy}
              readOnly={readOnly}
              onMove={move}
              onStart={start}
              onStop={() => void stop()}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
