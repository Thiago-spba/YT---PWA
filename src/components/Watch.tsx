import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { isFavorite, listCatalog, recordHistory, toggleFavorite } from '../lib/db'
import { addUsageMinutes, getDailyLimitMinutes, isParentalControlEnabled } from '../lib/storage'
import { hasApiKey, searchVideosPage } from '../lib/youtube'
import { loadYouTubeApi, type YTPlayer } from '../lib/youtubePlayer'
import VideoCard from './VideoCard'

interface Props {
  video: Video
  onClose: () => void
  onSelect: (video: Video) => void
  onTimeUp: () => void
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
      />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
    </svg>
  )
}

function CompressIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h4V4M20 8h-4V4M4 16h4v4M20 16h-4v4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

const iconButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
const iconButtonClassDark =
  'flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-white hover:bg-neutral-600'

export default function Watch({ video, onClose, onSelect, onTimeUp }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [catalogFeed, setCatalogFeed] = useState<Video[]>([])
  const [suggested, setSuggested] = useState<Video[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)

  // Cria o player uma única vez; trocar de vídeo só chama loadVideoById,
  // preservando a mesma instância entre o modo janela e tela cheia.
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: video.id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, autoplay: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true
          },
          onError: () => setVideoError(true),
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    recordHistory(video)
    isFavorite(video.id).then(setFavorite)
    setVideoError(false)

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

    if (readyRef.current) {
      playerRef.current?.loadVideoById(video.id)
    } else {
      const wait = setInterval(() => {
        if (readyRef.current) {
          playerRef.current?.loadVideoById(video.id)
          clearInterval(wait)
        }
      }, 150)
      return () => clearInterval(wait)
    }
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

  const playerArea = (
    <div className={fullscreen ? 'relative flex-1' : 'relative aspect-video w-full overflow-hidden rounded-lg bg-black'}>
      <div ref={containerRef} className="h-full w-full" />
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/95 p-4 text-center text-white">
          <p className="text-sm">
            Este vídeo não está disponível (foi removido, ou o dono não permite assistir fora
            do YouTube).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-700"
          >
            Voltar ao catálogo
          </button>
        </div>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="flex items-center justify-between bg-neutral-900 p-3 text-white">
          <p className="truncate text-sm">{video.title}</p>
          <div className="ml-4 flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleToggleFavorite}
              title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              className={favorite ? 'flex h-9 w-9 items-center justify-center rounded-full bg-violet-600' : iconButtonClassDark}
            >
              <StarIcon filled={favorite} />
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              title="Sair da tela cheia"
              aria-label="Sair da tela cheia"
              className={iconButtonClassDark}
            >
              <CompressIcon />
            </button>
          </div>
        </div>
        {playerArea}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      {playerArea}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {video.title}
        </h1>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
            aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
            className={favorite ? 'flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white' : iconButtonClass}
          >
            <StarIcon filled={favorite} />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            title="Tela cheia"
            aria-label="Tela cheia"
            className={iconButtonClass}
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className={iconButtonClass}
          >
            <CloseIcon />
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
