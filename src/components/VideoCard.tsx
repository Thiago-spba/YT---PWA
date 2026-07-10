import { useEffect, useState } from 'react'
import type { Video } from '../types'
import { resolveThumbnail } from '../lib/thumbnail'
import { formatDuration } from '../lib/format'
import { isFavorite, isInPlaylist, toggleFavorite, toggleInPlaylist } from '../lib/db'

interface Props {
  video: Video
  onSelect: (video: Video) => void
  /** 'grid' (padrão, cartão vertical) ou 'list' (linha horizontal, usada em "A seguir"). */
  variant?: 'grid' | 'list'
  /** Quando presente, mostra a lixeira para excluir o vídeo desta lista. */
  onDelete?: (video: Video) => void
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
      />
    </svg>
  )
}

function channelInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function VideoCard({ video, onSelect, variant = 'grid', onDelete }: Props) {
  const [inPlaylist, setInPlaylist] = useState(false)
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    isInPlaylist(video.id).then(setInPlaylist)
    isFavorite(video.id).then(setFavorite)
  }, [video.id])

  async function handleTogglePlaylist(e: React.MouseEvent) {
    e.stopPropagation()
    setInPlaylist(await toggleInPlaylist(video))
  }

  async function handleToggleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    setFavorite(await toggleFavorite(video))
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete?.(video)
  }

  const thumb = (
    <div
      className={
        variant === 'list'
          ? 'relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-neutral-200 sm:w-44 dark:bg-neutral-800'
          : 'relative aspect-video w-full overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800'
      }
    >
      <img
        src={video.thumbnailUrl || resolveThumbnail(video.id)}
        alt=""
        className="h-full w-full object-cover transition group-hover:scale-105"
        loading="lazy"
      />
      {video.durationSeconds != null && video.durationSeconds > 0 && (
        <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 py-0.5 text-[11px] font-medium leading-none text-white">
          {formatDuration(video.durationSeconds)}
        </span>
      )}
    </div>
  )

  const plusButton = (
    <button
      type="button"
      onClick={handleTogglePlaylist}
      title={inPlaylist ? 'Remover da playlist' : 'Adicionar à playlist'}
      aria-label={inPlaylist ? 'Remover da playlist' : 'Adicionar à playlist'}
      className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-white ${
        inPlaylist ? 'bg-violet-600' : 'bg-black/60 hover:bg-black/80'
      }`}
    >
      {inPlaylist ? <CheckIcon /> : <PlusIcon />}
    </button>
  )

  // Favoritar e excluir ficam empilhados no canto superior direito, como
  // botões IRMÃOS do botão de selecionar (nunca dentro dele) — um
  // <button> dentro de outro <button> é HTML inválido e quebra a
  // hidratação do React.
  const topRightButtons = (
    <div className="absolute right-1 top-1 flex flex-col gap-1">
      <button
        type="button"
        onClick={handleToggleFavorite}
        title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
        aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
        className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${
          favorite ? 'bg-violet-600' : 'bg-black/60 hover:bg-black/80'
        }`}
      >
        <StarIcon filled={favorite} />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          title="Excluir desta lista"
          aria-label="Excluir desta lista"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  )

  if (variant === 'list') {
    return (
      <div className="group relative flex w-full gap-2 rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
        <button type="button" onClick={() => onSelect(video)} className="flex min-w-0 flex-1 gap-2 text-left">
          {thumb}
          <div className="min-w-0 py-0.5">
            <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {video.title}
            </p>
            <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {video.channelTitle}
            </p>
          </div>
        </button>
        {plusButton}
        {topRightButtons}
      </div>
    )
  }

  return (
    <div className="group relative flex flex-col gap-2">
      <button type="button" onClick={() => onSelect(video)} className="flex flex-col gap-2 text-left">
        {thumb}
        <div className="flex gap-2">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
            {channelInitials(video.channelTitle)}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {video.title}
            </p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{video.channelTitle}</p>
          </div>
        </div>
      </button>
      {plusButton}
      {topRightButtons}
    </div>
  )
}
