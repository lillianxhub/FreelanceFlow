/* eslint-disable react-hooks/refs -- dnd-kit exposes DOM bindings through hook return values. */
'use client'
import type { ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PlannedTask } from '../services/dailyPlan'

export function AvailableTask({
  task,
  onAdd,
  disabled,
}: {
  task: PlannedTask
  onAdd: () => void
  disabled: boolean
}) {
  const drag = useDraggable({ id: `pool:${task.id}`, disabled })
  return (
    <div
      ref={drag.setNodeRef}
      className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0"
    >
      <button
        type="button"
        aria-label={`Drag ${task.name} into Today`}
        {...drag.listeners}
        {...drag.attributes}
        className="cursor-grab rounded px-1 text-subtle"
        disabled={disabled}
      >
        ⋮⋮
      </button>
      <span className="min-w-0 flex-1 truncate">
        {task.name}
        <small className="ml-2 text-text-secondary">{task.projectName}</small>
      </span>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
      >
        Add
      </button>
    </div>
  )
}
export function PlanRow({
  task,
  index,
  count,
  onMove,
  onRemove,
  running,
  onTimer,
  busy,
}: {
  task: PlannedTask
  index: number
  count: number
  onMove: (offset: number) => void
  onRemove: () => void
  running: boolean
  onTimer: () => void
  busy: boolean
}) {
  const drag = useSortable({ id: `plan:${task.id}` })
  return (
    <tr
      ref={drag.setNodeRef}
      style={{ transform: CSS.Transform.toString(drag.transform), transition: drag.transition }}
      className="border-b border-border last:border-b-0"
    >
      <td className="p-3">
        <button
          type="button"
          aria-label={`Drag ${task.name} to reorder`}
          {...drag.attributes}
          {...drag.listeners}
          className="cursor-grab text-subtle"
        >
          ⋮⋮
        </button>
      </td>
      <td className="p-3">{index + 1}</td>
      <td className="p-3">
        <span className="font-medium">{task.name}</span>
        <small className="block text-text-secondary">{task.projectName}</small>
      </td>
      <td className="p-3 text-xs">
        {task.status === 'COMPLETED' ? 'Done' : task.available ? 'Ready' : 'Unavailable'}
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-1">
          {task.available && task.status !== 'COMPLETED' && (
            <button
              type="button"
              disabled={busy}
              className="rounded border border-border px-2 py-1 text-xs"
              onClick={onTimer}
            >
              {running ? 'Stop timer' : 'Start timer'}
            </button>
          )}
          <button
            type="button"
            aria-label={`Move ${task.name} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="px-1 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move ${task.name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            className="px-1 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Remove ${task.name} from Today`}
            onClick={onRemove}
            className="px-1 text-text-secondary"
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  )
}
export function TodayDrop({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'today' })
  return (
    <div
      ref={setNodeRef}
      data-testid="today-drop"
      className={`rounded-xl border ${isOver ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}
    >
      {children}
    </div>
  )
}
