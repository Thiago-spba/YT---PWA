import { useEffect, useState } from 'react'
import type { Video } from '../types'
import VideoCard from './VideoCard'
import { listFavorites } from '../lib/db'

interface Props {
  onSelect: (video: Video) => void
}

export default function Favorites({ onSelect }: Props) {
  const [favorites, setFavorites] = useState<Video[]>([])

  useEffect(() => {
    listFavorites().then(setFavorites)
  }, [])

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-lg font-semibold">Favoritos</h1>
      {favorites.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhum favorito ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {favorites.map((v) => (
            <VideoCard key={v.id} video={v} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
