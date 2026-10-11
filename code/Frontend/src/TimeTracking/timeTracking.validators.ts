import type {
  ManualTimeFieldErrors,
  ManualTimeFieldName,
  ManualTimeForm,
} from '../types/timeTrackerPage'

export function validateManualTimeField(
  field: ManualTimeFieldName,
  value: ManualTimeForm,
): string | undefined {
  if (field === 'project_id' && !value.project_id) return 'Select a project'
  if (field === 'entry_date' && !/^\d{4}-\d{2}-\d{2}$/.test(value.entry_date))
    return 'Select a date'
  if (field === 'manual_mode' && !value.manual_mode) return 'Select a time entry method'
  if (field === 'start_time' && !value.start_time) return 'Enter a start time'

  if (field === 'end_time') {
    if (!value.end_time) return 'Enter an end time'
    if (value.start_time && value.end_time <= value.start_time)
      return 'End time must be after start time'
  }

  if (field === 'duration_minutes' && Number(value.duration_minutes) <= 0) {
    return 'Duration must be greater than 0 minutes'
  }

  return undefined
}

export function validateManualTimeForm(value: ManualTimeForm): ManualTimeFieldErrors {
  const fields: ManualTimeFieldName[] = [
    'project_id',
    'task_id',
    'entry_date',
    'manual_mode',
    'start_time',
    value.manual_mode === 'RANGE' ? 'end_time' : 'duration_minutes',
  ]

  return fields.reduce<ManualTimeFieldErrors>((errors, field) => {
    const error = validateManualTimeField(field, value)
    if (error) errors[field] = error
    return errors
  }, {})
}
