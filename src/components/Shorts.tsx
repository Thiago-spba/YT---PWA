import { useEffect, useRef, useState, useCallback } from 'react'
import type { Video } from '../types'
import { isFavorite, recordHistory, recordInterest, removeFromCatalog, toggleFavorite } from '../lib/db'
import { categorize } from '../lib/categories'
import { hasApiKey, searchShortsPage, YoutubeApiError } from '../lib/youtube'
import { loadYouTubeApi, type YTPlayer } from '../lib/youtubePlayer'
import type { ShortsFeed } from '../lib/useShortsFeed'

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path strokeLinejoin="round" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />
    </svg>
  )
}
function MuteIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path strokeLinecap="round" d="M16 9l6 6M22 9l-6 6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path strokeLinecap="round" d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
      <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
    </svg>
  )
}
function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l6-6 6 6" />
    </svg>
  )
}
function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}
function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  )
}

interface Props {
  initialFeed: Video[]
  feedHook: ShortsFeed
  onBack?: () => void
}

export default function Shorts({ initialFeed, feedHook, onBack }: Props) {
  const { loadingMore: feedLoadingMore, discoveryError, catalogIdsRef, loadMore: loadMoreFeed, retryDiscovery, removeFromFeed } = feedHook

  const [feed, setFeed] = useState<Video[]>(initialFeed)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [favorite, setFavorite] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const searchQueryRef = useRef<string | null>(null)
  const searchTokenRef = useRef<string | undefined>(undefined)
  const searchSeenRef = useRef(new Set<string>())
  const originalFeedRef = useRef<Video[]>(initialFeed)
  /** true se o usuÃ¡rio pausou manualmente o vÃ­deo atual â€” impede auto-advance no ENDED. */
  const userPausedRef = useRef(false)

  const activeVideo = feed[activeIndex] ?? null
  const loadingMore = isSearchMode ? searchLoadingMore : feedLoadingMore

  useEffect(() => {
    if (feed.length === 0) return
    const v = feed[0]
    recordHistory(v).catch(() => {})
    recordInterest(categorize(v.title + ' ' + v.channelTitle), 2).catch(() => {})
    isFavorite(v.id).then(setFavorite).catch(() => {})
    function tryLoad() {
      if (readyRef.current) {
        playerRef.current?.loadVideoById(v.id)
        if (muted) playerRef.current?.mute()
        else playerRef.current?.unMute()
        if (isPlaying) playerRef.current?.playVideo()
        else playerRef.current?.pauseVideo()
      } else {
        setTimeout(tryLoad, 150)
      }
    }
    tryLoad()
  }, [])

  useEffect(() => {
    if (!activeVideo || activeIndex === 0) return
    recordHistory(activeVideo).catch(() => {})
    recordInterest(categorize(activeVideo.title + ' ' + activeVideo.channelTitle), 2).catch(() => {})
    isFavorite(activeVideo.id).then(setFavorite).catch(() => {})
    function tryLoad() {
      if (readyRef.current) {
        playerRef.current?.loadVideoById(activeVideo!.id)
        if (muted) playerRef.current?.mute()
        else playerRef.current?.unMute()
        if (isPlaying) playerRef.current?.playVideo()
        else playerRef.current?.pauseVideo()
      } else {
        setTimeout(tryLoad, 150)
      }
    }
    tryLoad()
    if (activeIndex >= feed.length - 3) loadMore()
  }, [activeIndex])

  /** AvanÃ§a para o prÃ³ximo vÃ­deo do feed (se houver). */
  const goToNext = useCallback(() => {
    setActiveIndex((i) => {
      const next = Math.min(i + 1, feed.length - 1)
      if (next !== i) {
        userPausedRef.current = false // reset ao trocar de vÃ­deo
      }
      return next
    })
  }, [feed.length])

  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return
      playerRef.current = new YT.Player(playerContainerRef.current, {
        videoId: feed[0]?.id ?? '',
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { 
          rel: 0, 
          autoplay: 1, 
          controls: 0, 
          playsinline: 1, 
          modestbranding: 1, 
          origin: window.location.origin,
          mute: 1
        },
        events: {
          onReady: () => { 
            readyRef.current = true
            if (isPlaying) playerRef.current?.playVideo()
          },
          onStateChange: (e) => { 
            // YT.PlayerState.ENDED === 0
            if (e.data === 0) {
              // Auto-advance sÃ³ se o usuÃ¡rio NÃƒO pausou manualmente antes de acabar
              if (!userPausedRef.current) {
                goToNext()
              } else {
                // UsuÃ¡rio pausou antes de acabar â†’ sÃ³ marca como parado
                setIsPlaying(false)
              }
            }
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
  }, [goToNext])

  useEffect(() => {
    if (muted) playerRef.current?.mute()
    else playerRef.current?.unMute()
  }, [muted])

  useEffect(() => {
    if (isPlaying) playerRef.current?.playVideo()
    else playerRef.current?.pauseVideo()
  }, [isPlaying])

  async function loadMore() {
    if (isSearchMode) {
      if (!hasApiKey() || searchLoadingMore || !searchTokenRef.current || !searchQueryRef.current) return
      setSearchLoadingMore(true)
      try {
        const page = await searchShortsPage(searchQueryRef.current, searchTokenRef.current)
        searchTokenRef.current = page.nextPageToken
        const fresh = page.videos.filter((v) => !searchSeenRef.current.has(v.id))
        fresh.forEach((v) => searchSeenRef.current.add(v.id))
        if (fresh.length > 0) setFeed((c) => [...c, ...fresh])
      } catch { searchTokenRef.current = undefined }
      finally { setSearchLoadingMore(false) }
      return
    }
    await loadMoreFeed()
    setFeed([...originalFeedRef.current, ...feedHook.shorts.slice(originalFeedRef.current.length)])
  }

  function scrollTo(idx: number) {
    if (idx < 0 || idx >= feed.length) return
    setActiveIndex(idx)
    const el = containerRef.current?.children[idx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleToggleFavorite() {
    if (!activeVideo) return
    setFavorite(await toggleFavorite(activeVideo))
  }

  async function handleDeleteActive() {
    if (!activeVideo || !catalogIdsRef.current.has(activeVideo.id)) return
    const id = activeVideo.id
    await removeFromCatalog(id)
    catalogIdsRef.current.delete(id)
    removeFromFeed(id)
    setFeed((c) => c.filter((v) => v.id !== id))
    setActiveIndex((i) => Math.max(0, i - 1))
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearching(true)
    setSearchStatus(null)
    try {
      searchSeenRef.current = new Set()
      const page = await searchShortsPage(value)
      page.videos.forEach((v) => searchSeenRef.current.add(v.id))
      searchTokenRef.current = page.nextPageToken
      searchQueryRef.current = value
      setFeed(page.videos)
      setActiveIndex(0)
      setIsSearchMode(true)
      if (page.videos.length === 0) setSearchStatus('Nenhum video curto encontrado.')
    } catch (err) {
      setSearchStatus(err instanceof YoutubeApiError ? err.message : 'Erro ao buscar.')
    } finally { setSearching(false) }
  }

  function handleExitSearch() {
    setFeed(originalFeedRef.current)
    setActiveIndex(0)
    setIsSearchMode(false)
    setSearchStatus(null)
    setQuery('')
    searchQueryRef.current = null
    searchTokenRef.current = undefined
  }

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col overflow-hidden bg-black">
      {onBack && (
        <button type="button" onClick={onBack} className="absolute left-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
          <BackArrowIcon />
        </button>
      )}
      {hasApiKey() && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar shorts..." className="w-32 rounded-full border border-neutral-700 bg-black/70 px-3 py-1 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-violet-500" />
            <button type="submit" disabled={searching} className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-50">
              <SearchIcon />
            </button>
          </form>
          {isSearchMode && (
            <button type="button" onClick={handleExitSearch} className="rounded-full bg-black/50 px-2 py-1 text-xs text-white">Voltar</button>
          )}
        </div>
      )}
      {feed.length === 0 ? (
        <div className="m-auto flex flex-col items-center gap-3 p-8 text-center text-sm text-neutral-400">
          {discoveryError ? (
            <>
              <p>{discoveryError}</p>
              <button type="button" onClick={retryDiscovery} className="rounded-full bg-violet-600 px-4 py-2 text-sm text-white">Tentar de novo</button>
            </>
          ) : (
            <p>Nenhum video curto. Adicione pelo Catalogo ou importe do Google.</p>
          )}
        </div>
      ) : (
        <>
          <div ref={containerRef} className="flex-1 snap-y snap-mandatory overflow-y-scroll">
            {feed.map((v, i) => (
              <div key={v.id} className="relative h-full w-full snap-start overflow-hidden bg-neutral-900">
                <img src={v.thumbnailUrl} alt="" className={"h-full w-full object-cover " + (i === activeIndex ? "opacity-0" : "opacity-100")} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10">
                  <p className="line-clamp-2 text-sm font-medium text-white">{v.title}</p>
                  <p className="text-xs text-neutral-300">{v.channelTitle}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0">
            <div ref={playerContainerRef} className="pointer-events-none h-full w-full" />
          </div>
          <div className="pointer-events-none absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4">
            <button type="button" onClick={handleToggleFavorite} className={"pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white " + (favorite ? "bg-violet-600" : "bg-black/50")}>
              <StarIcon filled={favorite} />
            </button>
            <button type="button" onClick={() => setMuted((m) => !m)} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
              <MuteIcon muted={muted} />
            </button>
            <button 
              type="button" 
              onClick={() => {
                userPausedRef.current = isPlaying // se vai pausar, marca userPaused; se vai dar play, limpa
                setIsPlaying((p) => !p)
              }} 
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            {activeVideo && catalogIdsRef.current.has(activeVideo.id) && (
              <button type="button" onClick={handleDeleteActive} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600">
                <TrashIcon />
              </button>
            )}
          </div>
          <button type="button" onClick={() => scrollTo(activeIndex - 1)} disabled={activeIndex === 0} className="pointer-events-auto absolute left-1/2 top-12 z-20 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-0">
            <ChevronUpIcon />
          </button>
          <button type="button" onClick={() => scrollTo(activeIndex + 1)} disabled={activeIndex >= feed.length - 1} className="pointer-events-auto absolute left-1/2 bottom-4 z-20 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-0">
            <ChevronDownIcon />
          </button>
          {searchStatus && <p className="absolute inset-x-0 top-16 text-center text-sm text-neutral-300">{searchStatus}</p>}
          {loadingMore && <p className="absolute inset-x-0 bottom-1 text-center text-xs text-neutral-400">Carregando mais...</p>}
        </>
      )}
    </div>
  )
}


