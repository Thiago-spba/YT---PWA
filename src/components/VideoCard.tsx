import type { Video } from '../types'
import { resolveThumbnail } from '../lib/thumbnail'

interface Props {
  video: Video
  onSelect: (video: Video) => void
}

export default function VideoCard({ video, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 text-left transition hover:shadow-md dark:border-neutral-700"
    >
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
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {video.channelTitle}
        </p>
      </div>
    </button>
  )
}
