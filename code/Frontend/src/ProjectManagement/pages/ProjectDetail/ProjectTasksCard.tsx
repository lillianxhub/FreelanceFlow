import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import PaginationControls from '../../../components/PaginationControls'
import TaskList from '../../components/TaskList'
import ProjectBoard from '../../components/ProjectBoard'
import type { Project } from '../../../types/project'
import type { Task } from '../../../types/task'

const TASK_PAGE_SIZE = 5

type Props = {
  project: Project
  tasks: Task[]
  changingTaskId: string | null
  onAdd: () => void
  onChanged: () => Promise<void>
  onToggle: (task: Task) => void
  onMove: (task: Task, direction: -1 | 1) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

export function ProjectTasksCard({
  project,
  tasks,
  changingTaskId,
  onAdd,
  onChanged,
  onToggle,
  onMove,
  onEdit,
  onDelete,
}: Props) {
  const [taskView, setTaskView] = useState<'BOARD' | 'TABLE'>('BOARD')
  const [taskPage, setTaskPage] = useState(1)
  const taskTotalPages = Math.max(1, Math.ceil(tasks.length / TASK_PAGE_SIZE))
  const currentTaskPage = Math.min(taskPage, taskTotalPages)
  const taskStartIndex = (currentTaskPage - 1) * TASK_PAGE_SIZE
  const visibleTasks = tasks.slice(taskStartIndex, taskStartIndex + TASK_PAGE_SIZE)
  return (
    <Card asChild>
      <section className="!p-0">
        <CardHeader className="flex flex-col items-start justify-between gap-4 p-6 pb-2 sm:flex-row">
          <div className="grid gap-1">
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Create, complete, edit, and reorder project tasks</CardDescription>
          </div>
          <Button variant="default" className="h-10" type="button" onClick={onAdd}>
            <FiPlus aria-hidden="true" /> Add task
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="mb-4 flex gap-2" role="group" aria-label="Task view">
            <button
              type="button"
              aria-pressed={taskView === 'BOARD'}
              onClick={() => setTaskView('BOARD')}
              className={`rounded border px-3 py-1 text-sm ${taskView === 'BOARD' ? 'border-primary text-primary' : 'border-border'}`}
            >
              Board
            </button>
            <button
              type="button"
              aria-pressed={taskView === 'TABLE'}
              onClick={() => setTaskView('TABLE')}
              className={`rounded border px-3 py-1 text-sm ${taskView === 'TABLE' ? 'border-primary text-primary' : 'border-border'}`}
            >
              Table
            </button>
          </div>
          {taskView === 'BOARD' ? (
            <ProjectBoard
              projectId={project.id}
              tasks={tasks}
              onChanged={onChanged}
              readOnly={project.status !== 'ACTIVE'}
            />
          ) : (
            <>
              <TaskList
                tasks={visibleTasks}
                startIndex={taskStartIndex}
                totalTasks={tasks.length}
                changingTaskId={changingTaskId}
                onToggle={(task) => {
                  onToggle(task)
                }}
                onMove={onMove}
                onEdit={onEdit}
                onDelete={onDelete}
              />
              {tasks.length > 0 && (
                <div className="mt-4 grid gap-2 border-t border-border pt-4">
                  <p className="text-center text-xs text-text-secondary">
                    Showing {taskStartIndex + 1}–
                    {Math.min(taskStartIndex + TASK_PAGE_SIZE, tasks.length)} of {tasks.length}{' '}
                    Tasks · Page {currentTaskPage}/{taskTotalPages}
                  </p>
                  <PaginationControls
                    page={currentTaskPage}
                    totalPages={taskTotalPages}
                    onPageChange={setTaskPage}
                    queryParam="taskPage"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </section>
    </Card>
  )
}
