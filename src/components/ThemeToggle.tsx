import { useState } from 'react'
import { getStoredTheme, setTheme, type Theme } from '../lib/theme'

const order: Theme[] = ['system', 'light', 'dark']
const titles: Record<Theme, string> = {
  system: 'Tema: sistema',
  light: 'Tema: claro',
  dark: 'Tema: escuro',
}

function Icon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        />
      </svg>
    )
  }
  if (theme === 'dark') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M20.7 15.3a8.5 8.5 0 1 1-10-11 7 7 0 0 0 10 11z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  )
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
      title={titles[theme]}
      aria-label={titles[theme]}
      className="fixed right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-neutral-600 shadow backdrop-blur hover:bg-white dark:bg-neutral-900/70 dark:text-neutral-300 dark:hover:bg-neutral-900"
    >
      <Icon theme={theme} />
    </button>
  )
}
