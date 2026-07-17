import { useState } from 'react'
import { getStoredTheme, setTheme, type Theme } from '../lib/theme'

type View = 'home' | 'catalog' | 'favorites' | 'playlist' | 'history' | 'shorts'

interface Props {
  view: View
  onChange: (view: View) => void
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

function CatalogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function FavoritesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinejoin="round" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
    </svg>
  )
}

function PlaylistIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="M4 6h12M4 12h12M4 18h7" />
      <path d="M18 14l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
    </svg>
  )
}

function ShortsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path fill="currentColor" stroke="none" d="M10.5 9.5l4 2.5-4 2.5z" />
    </svg>
  )
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
  if (theme === 'dark') return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M20.7 15.3a8.5 8.5 0 1 1-10-11 7 7 0 0 0 10 11z" />
    </svg>
  )
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  )
}

const items: { key: View; label: string; icon: () => React.JSX.Element }[] = [
  { key: 'home', label: 'Início', icon: HomeIcon },
  { key: 'catalog', label: 'Meus Canais', icon: CatalogIcon },
  { key: 'shorts', label: 'Shorts', icon: ShortsIcon },
  { key: 'favorites', label: 'Favoritos', icon: FavoritesIcon },
  { key: 'playlist', label: 'Playlist', icon: PlaylistIcon },
  { key: 'history', label: 'Histórico', icon: HistoryIcon },
]

const themeOrder: Theme[] = ['system', 'light', 'dark']

export default function TopBar({ view, onChange }: Props) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme())

  function cycleTheme() {
    const next = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length]
    setTheme(next)
    setThemeState(next)
  }

  return (
    <header className="sticky top-0 z-50 flex items-center gap-1 border-b border-neutral-200 bg-white/90 backdrop-blur-md p-2 dark:border-neutral-700 dark:bg-neutral-900/90">
      <span className="mr-2 pl-2 text-lg font-bold text-violet-700 dark:text-violet-300 shrink-0">
        YT
      </span>
      <nav className="flex flex-1 flex-wrap gap-1 min-w-0">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              title={item.label}
              aria-label={item.label}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                view === item.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          )
        })}
      </nav>
      {/* Dark mode — sempre visível na TopBar, nunca some */}
      <button
        type="button"
        onClick={cycleTheme}
        title={`Tema: ${theme}`}
        aria-label={`Tema: ${theme}`}
        className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 mr-12"
      >
        <ThemeIcon theme={theme} />
      </button>
    </header>
  )
}
