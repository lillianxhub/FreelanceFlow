'use client'

import { useSyncExternalStore } from 'react'
import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from 'next-themes'
import { Button } from './ui/button'

type ThemeChoice = 'light' | 'dark' | 'system'
const themes: ThemeChoice[] = ['light', 'dark', 'system']

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const current = mounted && theme ? theme : 'system'
  const next = themes[(themes.indexOf(current as ThemeChoice) + 1) % themes.length]
  const Icon = current === 'dark' ? FiMoon : current === 'light' ? FiSun : FiMonitor
  const label = `Theme: ${current}. Switch to ${next} theme`

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className="size-10 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
