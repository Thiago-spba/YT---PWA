import { useState } from 'react'
import { getStoredTheme, setTheme, type Theme } from '../lib/theme'

const order: Theme[] = ['system', 'light', 'dark']
const labels: Record<Theme, string> = {
  system: '🖥️ Sistema',
  light: '☀️ Claro',
  dark: '🌙 Escuro',
}

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme())

  function cycle() {
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
    setThemeState(next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="rounded px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      {labels[theme]}
    </button>
  )
}
