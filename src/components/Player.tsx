import { useEffect, useState } from 'react'
import type { Video } from '../types'
import { isFavorite, recordHistory, toggleFavorite } from '../lib/db'
import { addUsageMinutes, getDailyLimitMinutes, isParentalControlEnabled } from '../lib/storage'

interface Props {
  video: Video
  onClose: () => void
  onTimeUp: () => void
}

export default function Player({ video, onClose, onTimeUp }: Props) {
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    recordHistory(video)
    isFavorite(video.id).then(setFavorite)
  }, [video])

  useEffect(() => {
    if (!isParentalControlEnabled()) return
    const limit = getDailyLimitMinutes()
    if (!limit) return
    const interval = setInterval(() => {
      const total = addUsageMinutes(1)
      if (total >= limit) onTimeUp()
    }, 60_000)
    return () => clearInterval(interval)
  }, [onTimeUp])

  async function handleToggleFavorite() {
    setFavorite(await toggleFavorite(video))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between bg-neutral-900 p-3 text-white">
        <p className="truncate text-sm">{video.title}</p>
        <div className="ml-4 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`rounded px-3 py-1 text-sm ${
              favorite ? 'bg-violet-600' : 'bg-neutral-700 hover:bg-neutral-600'
            }`}
          >
            {favorite ? '★ Favorito' : '☆ Favoritar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-neutral-700 px-3 py-1 text-sm hover:bg-neutral-600"
          >
            Fechar
          </button>
        </div>
      </div>
      <div className="flex-1">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  )
}
