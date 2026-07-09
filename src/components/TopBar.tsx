type View = 'catalog' | 'favorites'

interface Props {
  view: View
  onChange: (view: View) => void
}

const items: { key: View; label: string }[] = [
  { key: 'catalog', label: 'Catálogo' },
  { key: 'favorites', label: 'Favoritos' },
]

export default function TopBar({ view, onChange }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900">
      <span className="mr-3 pl-2 text-lg font-bold text-violet-700 dark:text-violet-300">
        YT
      </span>
      <nav className="flex flex-wrap gap-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              view === item.key
                ? 'bg-violet-600 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
