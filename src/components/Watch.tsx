import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { isFavorite, listCatalog, recordHistory, toggleFavorite } from '../lib/db'
import { addUsageMinutes, getDailyLimitMinutes, isParentalControlEnabled } from '../lib/storage'
import { hasApiKey, searchVideosPage } from '../lib/youtube'
import VideoCard from './VideoCard'

interface Props {
  video: Video
  onClose: () => void
  onSelect: (video: Video) => void
  onTimeUp: () => void
}

export default function Watch({ video, onClose, onSelect, onTimeUp }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [catalogFeed, setCatalogFeed] = useState<Video[]>([])
  const [suggested, setSuggested] = useState<Video[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    recordHistory(video)
    isFavorite(video.id).then(setFavorite)

    listCatalog().then((all) => setCatalogFeed(all.filter((v) => v.id !== video.id)))

    setSuggested([])
    setNextPageToken(undefined)
    if (hasApiKey()) {
      searchVideosPage(video.title)
        .then((page) => {
          setSuggested(page.videos.filter((v) => v.id !== video.id))
          setNextPageToken(page.nextPageToken)
        })
        .catch(() => {})
    }

    window.scrollTo({ top: 0 })
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
  }, [onTimeUp, video])

  useEffect(() => {
    if (!hasApiKey() || !nextPageToken) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          setLoadingMore(true)
          searchVideosPage(video.title, nextPageToken)
            .then((page) => {
              setSuggested((current) => [
                ...current,
                ...page.videos.filter((v) => v.id !== video.id && !current.some((c) => c.id === v.id)),
              ])
              setNextPageToken(page.nextPageToken)
            })
            .finally(() => setLoadingMore(false))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nextPageToken, loadingMore, video])

  async function handleToggleFavorite() {
    setFavorite(await toggleFavorite(video))
  }

  const feed = [...catalogFeed, ...suggested]

  if (fullscreen) {
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
              onClick={() => setFullscreen(false)}
              className="rounded bg-neutral-700 px-3 py-1 text-sm hover:bg-neutral-600"
            >
              Sair da tela cheia
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

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {video.title}
        </h1>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              favorite
                ? 'bg-violet-600 text-white'
                : 'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
            }`}
          >
            {favorite ? '★ Favorito' : '☆ Favoritar'}
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="rounded bg-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            Tela cheia
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
          >
            Fechar
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Dica: o próprio player tem um botão de miniplayer (picture-in-picture) nos controles
        de vídeo, para continuar assistindo em uma janelinha flutuante enquanto navega.
      </p>

      {feed.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Mais vídeos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {feed.map((v) => (
              <VideoCard key={v.id} video={v} onSelect={onSelect} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Carregando mais vídeos…
            </p>
          )}
        </section>
      )}
    </div>
  )
}
