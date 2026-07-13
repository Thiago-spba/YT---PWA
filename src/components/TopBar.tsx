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

const items: { key: View; label: string; icon: () => React.JSX.Element }[] = [
  { key: 'home', label: 'Início', icon: HomeIcon },
  { key: 'catalog', label: 'Meus Canais', icon: CatalogIcon },
  { key: 'shorts', label: 'Shorts', icon: ShortsIcon },
  { key: 'favorites', label: 'Favoritos', icon: FavoritesIcon },
  { key: 'playlist', label: 'Playlist', icon: PlaylistIcon },
  { key: 'history', label: 'Histórico', icon: HistoryIcon },
]

export default function TopBar({ view, onChange }: Props) {
  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-white/80 backdrop-blur-sm p-2 dark:border-neutral-700 dark:bg-neutral-900/80">
      <span className="mr-3 pl-2 text-lg font-bold text-violet-700 dark:text-violet-300">
        YT
      </span>
      <nav className="flex flex-wrap gap-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              title={item.label}
              aria-label={item.label}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium sm:px-3 ${
                view === item.key
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </header>
  )
}

