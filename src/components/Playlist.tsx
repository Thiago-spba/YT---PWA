import { useEffect, useState } from 'react'
import type { PlaylistEntry, Video } from '../types'
import { resolveThumbnail } from '../lib/thumbnail'
import { listPlaylist, movePlaylistItem, removeFromPlaylist } from '../lib/db'

interface Props {
  onSelect: (video: Video, queue?: Video[]) => void
}

function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l6-6 6 6" />
    </svg>
  )
}

function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export default function Playlist({ onSelect }: Props) {
  const [items, setItems] = useState<PlaylistEntry[]>([])

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setItems(await listPlaylist())
  }

  async function handleMove(id: string, direction: 'up' | 'down') {
    await movePlaylistItem(id, direction)
    await refresh()
  }

  async function handleRemove(id: string) {
    await removeFromPlaylist(id)
    await refresh()
  }

  function handlePlayAll() {
    if (items.length === 0) return
    onSelect(items[0], items.slice(1))
  }

  function handlePlayFrom(index: number) {
    onSelect(items[index], items.slice(index + 1))
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Playlist</h1>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handlePlayAll}
            className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            <PlayIcon />
            Reproduzir tudo
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Sua playlist está vazia. Toque no ícone "+" em qualquer vídeo (na busca, favoritos,
          histórico ou início) para adicionar aqui, e organize a ordem que quiser.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((v, i) => (
            <li
              key={v.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2 dark:border-neutral-700"
            >
              <span className="w-5 shrink-0 text-center text-sm text-neutral-400">{i + 1}</span>
              <button type="button" onClick={() => handlePlayFrom(i)} className="flex flex-1 items-center gap-2 text-left">
                <img
                  src={v.thumbnailUrl || resolveThumbnail(v.id)}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded object-cover"
                  loading="lazy"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {v.title}
                  </span>
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {v.channelTitle}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(v.id, 'up')}
                  disabled={i === 0}
                  title="Mover para cima"
                  aria-label="Mover para cima"
                  className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  <UpIcon />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(v.id, 'down')}
                  disabled={i === items.length - 1}
                  title="Mover para baixo"
                  aria-label="Mover para baixo"
                  className="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  <DownIcon />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(v.id)}
                title="Remover da playlist"
                aria-label="Remover da playlist"
                className="shrink-0 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                remover
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
