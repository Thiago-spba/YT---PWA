import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { isFavorite, listCatalog, recordHistory, toggleFavorite } from '../lib/db'
import {
  addUsageMinutes,
  getDailyLimitMinutes,
  isAutoplayEnabled,
  isParentalControlEnabled,
  setAutoplayEnabled,
} from '../lib/storage'
import { hasApiKey, searchVideosPage } from '../lib/youtube'
import { loadYouTubeApi, YT_PLAYER_STATE_ENDED, type YTPlayer } from '../lib/youtubePlayer'
import VideoCard from './VideoCard'

export type PlayerMode = 'mini' | 'expanded'

interface Props {
  video: Video
  mode: PlayerMode
  onModeChange: (mode: PlayerMode) => void
  onClose: () => void
  onSelect: (video: Video, queue?: Video[]) => void
  onTimeUp: () => void
  queue: Video[]
  onQueueAdvance: () => void
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinejoin="round" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13H5" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

const iconButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600'
const iconButtonClassDark =
  'flex h-9 w-9 items-center justify-center rounded-full bg-neutral-700 text-white hover:bg-neutral-600'
const miniButtonClass =
  'flex h-6 w-6 items-center justify-center rounded text-white hover:bg-white/20'

export default function PlayerHost({
  video,
  mode,
  onModeChange,
  onClose,
  onSelect,
  onTimeUp,
  queue,
  onQueueAdvance,
}: Props) {
  const [subFullscreen, setSubFullscreen] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [catalogFeed, setCatalogFeed] = useState<Video[]>([])
  const [suggested, setSuggested] = useState<Video[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const [autoplay, setAutoplay] = useState(isAutoplayEnabled())
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const feedRef = useRef<Video[]>([])
  const queueRef = useRef<Video[]>(queue)
  const autoplayRef = useRef(autoplay)
  const onSelectRef = useRef(onSelect)
  const onQueueAdvanceRef = useRef(onQueueAdvance)
  const stackRef = useRef<Video[]>([video])
  const indexRef = useRef(0)
  const [, forceNavUpdate] = useState(0)

  useEffect(() => {
    autoplayRef.current = autoplay
  }, [autoplay])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    onQueueAdvanceRef.current = onQueueAdvance
  }, [onQueueAdvance])

  // Cria o player uma única vez, para a sessão inteira de reprodução.
  // Trocar de vídeo (ou de modo mini/expandido) só reposiciona esse
  // mesmo nó via CSS ou chama loadVideoById — nunca desmonta o
  // container, porque a API do YouTube substitui esse <div> por um
  // <iframe> por fora do React. Se o container fosse desmontado
  // condicionalmente, o React tentaria remover um nó que não é mais
  // filho dele (erro "removeChild") — foi exatamente o bug encontrado
  // no Watch e no Shorts antes desta arquitetura.
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
          onStateChange: (e) => {
            if (e.data !== YT_PLAYER_STATE_ENDED || !autoplayRef.current) return
            const fromQueue = queueRef.current[0]
            if (fromQueue) {
              onQueueAdvanceRef.current()
              onSelectRef.current(fromQueue)
              return
            }
            const next = feedRef.current[0]
            if (next) onSelectRef.current(next)
          },
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

  // Pilha de navegação (estilo histórico do navegador).
  useEffect(() => {
    const stack = stackRef.current
    const idx = indexRef.current
    if (stack[idx]?.id !== video.id) {
      if (stack[idx + 1]?.id === video.id) {
        indexRef.current = idx + 1
      } else if (idx > 0 && stack[idx - 1]?.id === video.id) {
        indexRef.current = idx - 1
      } else {
        stackRef.current = [...stack.slice(0, idx + 1), video]
        indexRef.current = stackRef.current.length - 1
      }
    }
    forceNavUpdate((n) => n + 1)
  }, [video])

  function handlePrev() {
    if (indexRef.current > 0) onSelect(stackRef.current[indexRef.current - 1])
  }

  function handleNext() {
    const stack = stackRef.current
    const idx = indexRef.current
    if (idx < stack.length - 1) {
      onSelect(stack[idx + 1])
      return
    }
    const fromQueue = queueRef.current[0]
    if (fromQueue) {
      onQueueAdvance()
      onSelect(fromQueue)
      return
    }
    const next = feedRef.current[0]
    if (next) onSelect(next)
  }

  const canGoPrev = indexRef.current > 0
  const canGoNext = indexRef.current < stackRef.current.length - 1 || queue.length > 0 || feedRef.current.length > 0

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

  useEffect(() => {
    feedRef.current = feed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogFeed, suggested])

  function handleToggleAutoplay() {
    const next = !autoplay
    setAutoplay(next)
    setAutoplayEnabled(next)
  }

  const visual: 'mini' | 'fullscreen' | 'windowed' =
    mode === 'mini' ? 'mini' : subFullscreen ? 'fullscreen' : 'windowed'

  return (
    <div
      className={
        visual === 'mini'
          ? 'fixed bottom-20 right-4 z-40 flex w-56 flex-col overflow-hidden rounded-lg bg-black shadow-2xl sm:w-64'
          : visual === 'fullscreen'
            ? 'fixed inset-0 z-50 flex flex-col bg-black'
            : 'fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white dark:bg-neutral-950'
      }
    >
      <div
        className={
          visual === 'mini'
            ? 'flex items-center justify-between gap-1 bg-neutral-900 px-2 py-1'
            : visual === 'fullscreen'
              ? 'order-1 flex items-center justify-between bg-neutral-900 p-3 text-white'
              : 'order-2 mx-auto mt-3 flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4'
        }
      >
        {visual === 'windowed' ? (
          <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{video.title}</h1>
        ) : (
          <p className={visual === 'mini' ? 'truncate text-xs text-white' : 'truncate text-sm text-white'}>
            {video.title}
          </p>
        )}
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          {visual !== 'mini' && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
              className={
                favorite
                  ? 'flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white'
                  : visual === 'fullscreen'
                    ? iconButtonClassDark
                    : iconButtonClass
              }
            >
              <StarIcon filled={favorite} />
            </button>
          )}
          {visual === 'mini' ? (
            <button
              type="button"
              onClick={() => onModeChange('expanded')}
              title="Expandir"
              aria-label="Expandir"
              className={miniButtonClass}
            >
              <ExpandIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSubFullscreen((v) => !v)}
              title={visual === 'fullscreen' ? 'Sair da tela cheia' : 'Tela cheia'}
              aria-label={visual === 'fullscreen' ? 'Sair da tela cheia' : 'Tela cheia'}
              className={visual === 'fullscreen' ? iconButtonClassDark : iconButtonClass}
            >
              {visual === 'fullscreen' ? <CompressIcon /> : <ExpandIcon />}
            </button>
          )}
          {visual === 'windowed' && (
            <button
              type="button"
              onClick={() => onModeChange('mini')}
              title="Minimizar"
              aria-label="Minimizar"
              className={iconButtonClass}
            >
              <MinimizeIcon />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className={visual === 'mini' ? miniButtonClass : visual === 'fullscreen' ? iconButtonClassDark : iconButtonClass}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div
        className={
          visual === 'mini'
            ? 'relative aspect-video w-full bg-black'
            : visual === 'fullscreen'
              ? 'order-2 relative flex-1'
              : 'order-1 relative mx-auto w-full max-w-5xl overflow-hidden rounded-lg bg-black px-4'
        }
      >
        <div ref={containerRef} className="h-full w-full" />

        {visual !== 'mini' && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canGoPrev}
              title="Vídeo anterior"
              aria-label="Vídeo anterior"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              title="Próximo vídeo"
              aria-label="Próximo vídeo"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}

        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/95 p-4 text-center text-white">
            <p className="text-sm">
              Este vídeo não está disponível (foi removido, ou o dono não permite assistir
              fora do YouTube).
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

      {visual === 'windowed' && (
        <div className="order-3 mx-auto w-full max-w-5xl px-4 pb-10">
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Toque em "Minimizar" para continuar assistindo numa janelinha enquanto navega por
            outras páginas do app.
          </p>

          {feed.length > 0 && (
            <section className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Mais vídeos</h2>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  Reprodução automática
                  <button
                    type="button"
                    onClick={handleToggleAutoplay}
                    aria-label="Reprodução automática"
                    className={`relative h-6 w-11 rounded-full transition ${
                      autoplay ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                        autoplay ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </label>
              </div>
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
      )}
    </div>
  )
}
