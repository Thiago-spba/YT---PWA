import { useEffect, useState } from 'react'
import type { Video } from '../types'
import { resolveThumbnail } from '../lib/thumbnail'
import { isInPlaylist, toggleInPlaylist } from '../lib/db'

interface Props {
  video: Video
  onSelect: (video: Video) => void
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

export default function VideoCard({ video, onSelect }: Props) {
  const [inPlaylist, setInPlaylist] = useState(false)

  useEffect(() => {
    isInPlaylist(video.id).then(setInPlaylist)
  }, [video.id])

  async function handleTogglePlaylist(e: React.MouseEvent) {
    e.stopPropagation()
    setInPlaylist(await toggleInPlaylist(video))
  }

  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 transition hover:shadow-md dark:border-neutral-700">
      <button type="button" onClick={() => onSelect(video)} className="flex flex-col text-left">
        <img
          src={video.thumbnailUrl || resolveThumbnail(video.id)}
          alt=""
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
        <div className="p-2">
          <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {video.title}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{video.channelTitle}</p>
        </div>
      </button>
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
    </div>
  )
}
