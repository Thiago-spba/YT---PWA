import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { isFavorite, recordHistory, recordInterest, removeFromCatalog, toggleFavorite } from '../lib/db'
import { categorize } from '../lib/categories'
import { hasApiKey, searchShortsPage, YoutubeApiError } from '../lib/youtube'
import { loadYouTubeApi, type YTPlayer } from '../lib/youtubePlayer'
import { useShortsFeed } from '../lib/useShortsFeed'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
      />
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

function PlayPauseIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M8 5v14l11-7z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
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

interface ThumbProps {
  video: Video
  isActive: boolean
  muted: boolean
  registerRef: (id: string, el: HTMLDivElement | null) => void
  onVisible: () => void
}

/**
 * Cada item da lista é só uma miniatura — nunca monta player próprio.
 * Isso evita que o React tente desmontar um nó de DOM que a API do
 * YouTube já substituiu por fora (erro "removeChild" visto no teste).
 * Quem toca o vídeo é o player único e persistente, sobreposto por
 * cima do item ativo (ver `Shorts`, mais abaixo).
 *
 * O bloco interno preenche 100% da altura/largura do slot (sem
 * aspect-ratio nem max-w/max-h) e a imagem usa object-cover — assim a
 * miniatura sempre cobre a tela inteira, cortando o excesso, em vez de
 * deixar barras vazias quando a proporção do aparelho não é exatamente
 * 9:16 (a maioria dos celulares atuais é mais alongada que isso).
 */
function ShortThumb({ video, isActive, muted, registerRef, onVisible }: ThumbProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    registerRef(video.id, el)
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onVisible()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      registerRef(video.id, null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={ref} className="relative h-full w-full snap-start">
      <div className="relative h-full w-full overflow-hidden bg-neutral-900">
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-opacity ${isActive ? 'opacity-0' : 'opacity-100'}`}
        />
        {muted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
            <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
            <p className="text-xs text-neutral-300">{video.channelTitle}</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  startId?: string
  onBack?: () => void
}

export default function Shorts({ startId, onBack }: Props) {
  // Feed geral (catálogo + descoberta, vindo do hook compartilhado com a
  // grade) e resultado de busca ficam separados — `shorts` (abaixo) é
  // sempre "o que está sendo exibido agora", trocando sozinho entre os
  // dois. Isso deixa a busca usar exatamente a mesma rolagem vertical
  // com favoritar/mudo/lixeira do feed normal, em vez de uma grade à
  // parte sem esses controles.
  const {
    shorts: feedShorts,
    loaded,
    loadingMore: feedLoadingMore,
    discoveryError,
    catalogIdsRef,
    loadMore: loadMoreFeed,
    retryDiscovery,
    removeFromFeed,
  } = useShortsFeed()
  const [searchFeed, setSearchFeed] = useState<Video[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const feedShortsRef = useRef<typeof feedShorts>([])
  const feedItemRefsRef = useRef(itemRefs.current)
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const searchQueryRef = useRef<string | null>(null)
  const searchTokenRef = useRef<string | undefined>(undefined)
  const searchSeenRef = useRef(new Set<string>())
  const lastFeedActiveIdRef = useRef<string | null>(null)
  const didInitRef = useRef(false)

  const shorts = searchFeed ?? feedShorts
  // Mantém ref atualizada para uso dentro dos closures do player
  feedShortsRef.current = feedShorts
  feedItemRefsRef.current = itemRefs.current
  const loadingMore = searchFeed !== null ? searchLoadingMore : feedLoadingMore

  // Define o item ativo inicial uma única vez, assim que o feed chegar
  // (preferindo `startId`, vindo da grade de descoberta, se ele estiver
  // na lista) — e rola até ele, já que o scroll-snap por padrão começa
  // no topo.
  useEffect(() => {
    if (!loaded || feedShorts.length === 0) return
    // startId vindo do card clicado tem prioridade — sempre navega até ele
    const target = startId && feedShorts.some((v) => v.id === startId)
      ? startId
      : feedShorts[0].id
    if (didInitRef.current && activeId === target) return
    didInitRef.current = true
    setActiveId(target)
    requestAnimationFrame(() => {
      itemRefs.current.get(target)?.scrollIntoView({ block: 'start' })
    })
  }, [loaded, feedShorts, startId])

  async function loadMore() {
    if (searchFeed !== null) {
      if (!hasApiKey() || searchLoadingMore) return
      if (!searchTokenRef.current || !searchQueryRef.current) return
      setSearchLoadingMore(true)
      try {
        const page = await searchShortsPage(searchQueryRef.current, searchTokenRef.current)
        searchTokenRef.current = page.nextPageToken
        const fresh = page.videos.filter((v) => !searchSeenRef.current.has(v.id))
        fresh.forEach((v) => searchSeenRef.current.add(v.id))
        if (fresh.length > 0) setSearchFeed((current) => [...(current ?? []), ...fresh])
      } catch {
        searchTokenRef.current = undefined
      } finally {
        setSearchLoadingMore(false)
      }
      return
    }
    await loadMoreFeed()
  }

  // Player único, criado uma vez. Trocar de short só chama loadVideoById
  // na mesma instância — o mesmo padrão usado em Watch.tsx.
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return
      playerRef.current = new YT.Player(playerContainerRef.current, {
        videoId: '',
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, autoplay: 1, controls: 0, playsinline: 1, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true
            playerRef.current?.mute()
          },
          onStateChange: (e) => {
            // 0 = terminou: avança para o próximo short automaticamente
            if (e.data === 0) {
              setPaused(false)
              setActiveId((current) => {
                const feed = feedShortsRef.current
                const idx = feed.findIndex((v) => v.id === current)
                const next = feed[idx + 1]
                if (next) {
                  feedItemRefsRef.current.get(next.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  return next.id
                }
                // sem próximo: reinicia o atual
                playerRef.current?.playVideo()
                return current
              })
            }
            if (e.data === 1) setPaused(false)
            if (e.data === 2) setPaused(true)
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

  useEffect(() => {
    if (!activeId) return
    const video = shorts.find((v) => v.id === activeId)
    if (!video) return
    recordHistory(video).catch(() => {})
    recordInterest(categorize(`${video.title} ${video.channelTitle}`), 2).catch(() => {})
    isFavorite(video.id)
      .then(setFavorite)
      .catch(() => {})

    function load() {
      try {
        playerRef.current?.loadVideoById(activeId!)
        if (muted) playerRef.current?.mute()
        setPaused(false)
      } catch { /* ignore */ }
    }
    if (readyRef.current) {
      load()
    } else {
      const wait = setInterval(() => {
        if (readyRef.current) {
          load()
          clearInterval(wait)
        }
      }, 150)
      return () => clearInterval(wait)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return
    try {
      if (muted) playerRef.current.mute()
      else playerRef.current.unMute()
    } catch { /* ignore */ }
  }, [muted])

  function registerRef(id: string, el: HTMLDivElement | null) {
    if (el) itemRefs.current.set(id, el)
    else itemRefs.current.delete(id)
  }

  function scrollToId(id: string) {
    itemRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activeIndex = shorts.findIndex((v) => v.id === activeId)
  const activeVideo = activeIndex >= 0 ? shorts[activeIndex] : null

  // Chegando perto do fim da lista já carregada, busca mais — assim a
  // rolagem nunca "acaba" enquanto a busca (ou o feed geral) ainda
  // tiver o que oferecer.
  useEffect(() => {
    if (activeIndex >= 0 && activeIndex >= shorts.length - 3) {
      loadMore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, shorts.length, searchFeed])

  function handlePrev() {
    if (activeIndex > 0) scrollToId(shorts[activeIndex - 1].id)
  }

  function handleNext() {
    if (activeIndex >= 0 && activeIndex < shorts.length - 1) {
      scrollToId(shorts[activeIndex + 1].id)
    }
  }

  function handleTogglePause() {
    if (!readyRef.current || !playerRef.current) return
    if (paused) {
      try { playerRef.current.playVideo() } catch { /* ignore */ }
      setPaused(false)
    } else {
      try { playerRef.current.pauseVideo() } catch { /* ignore */ }
      setPaused(true)
    }
  }

  async function handleToggleFavorite() {
    if (!activeVideo) return
    setFavorite(await toggleFavorite(activeVideo))
  }

  async function handleDeleteActive() {
    if (!activeVideo || !catalogIdsRef.current.has(activeVideo.id)) return
    const removedId = activeVideo.id
    const removedIndex = activeIndex
    await removeFromCatalog(removedId)
    catalogIdsRef.current.delete(removedId)
    function removeFromList(current: Video[]): Video[] {
      const next = current.filter((v) => v.id !== removedId)
      const nextActive = next[Math.min(removedIndex, next.length - 1)]
      setActiveId(nextActive?.id ?? null)
      return next
    }
    if (searchFeed !== null) {
      setSearchFeed((current) => removeFromList(current ?? []))
    } else {
      const nextActive = feedShorts.filter((v) => v.id !== removedId)[Math.min(removedIndex, feedShorts.length - 2)]
      setActiveId(nextActive?.id ?? null)
      removeFromFeed(removedId)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearching(true)
    setSearchStatus(null)
    lastFeedActiveIdRef.current = activeId
    try {
      searchSeenRef.current = new Set()
      const page = await searchShortsPage(value)
      page.videos.forEach((v) => searchSeenRef.current.add(v.id))
      searchTokenRef.current = page.nextPageToken
      searchQueryRef.current = value
      setSearchFeed(page.videos)
      setActiveId(page.videos[0]?.id ?? null)
      if (page.videos.length === 0) {
        setSearchStatus('Nenhum vídeo curto encontrado para essa busca.')
      }
    } catch (err) {
      setSearchStatus(err instanceof YoutubeApiError ? err.message : 'Erro ao buscar.')
    } finally {
      setSearching(false)
    }
  }

  function handleExitSearch() {
    setSearchFeed(null)
    setSearchStatus(null)
    setQuery('')
    searchQueryRef.current = null
    searchTokenRef.current = undefined
    setActiveId(lastFeedActiveIdRef.current ?? feedShorts[0]?.id ?? null)
  }

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col bg-black">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title="Voltar para a grade"
          aria-label="Voltar para a grade"
          className="absolute left-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <BackArrowIcon />
        </button>
      )}

      {hasApiKey() && (
        <form onSubmit={handleSearch} className="sticky top-0 z-50 flex shrink-0 justify-center items-center gap-2 border-b border-neutral-800 bg-neutral-900/80 px-3 py-2 backdrop-blur-sm">
          <div className="flex w-full max-w-sm items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar shorts…"
              className="flex-1 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              aria-label="Buscar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <SearchIcon />
            </button>
            {searchFeed !== null && (
              <button
                type="button"
                onClick={handleExitSearch}
                className="shrink-0 text-xs text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      )}

      {searchStatus && <p className="shrink-0 p-3 text-center text-sm text-neutral-300">{searchStatus}</p>}
      {searching && <p className="shrink-0 p-3 text-center text-sm text-neutral-400">Buscando…</p>}

      {searchFeed !== null && searchFeed.length === 0 ? null : loaded && shorts.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-neutral-400">
          {discoveryError ? (
            <>
              <p>{discoveryError}</p>
              <button
                type="button"
                onClick={() => retryDiscovery()}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Tentar de novo
              </button>
            </>
          ) : (
            <p>
              Nenhum vídeo curto por aqui ainda. Busque acima, adicione pelo Catálogo, ou importe
              da sua conta Google — vídeos de até 1 minuto aparecem aqui automaticamente.
            </p>
          )}
        </div>
      ) : (
        <div className="relative flex-1">
          <div className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll">
            {shorts.map((v) => (
              <ShortThumb
                key={v.id}
                video={v}
                isActive={v.id === activeId}
                muted={muted}
                registerRef={registerRef}
                onVisible={() => setActiveId(v.id)}
              />
            ))}
          </div>

          {/* Player único sobreposto — sem aspect-ratio/max-w/max-h: ele
              preenche exatamente a mesma área (100% da altura e largura
              do slot) que a miniatura por baixo, então não há barras
              vazias nem desalinhamento entre os dois. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="relative h-full w-full">
              {/* pointer-events-none: sem isso, o player bloqueia o gesto de
                  arrastar/rolar (o toque "morre" aqui em vez de chegar até
                  a lista rolável por baixo). O player não precisa capturar
                  toque — os controles (mudo/favoritar/setas) já são botões
                  próprios com pointer-events-auto individual. */}
              <div ref={playerContainerRef} className="pointer-events-none h-full w-full" />

              {activeVideo && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={activeIndex <= 0}
                    title="Vídeo anterior"
                    aria-label="Vídeo anterior"
                    className="pointer-events-auto absolute inset-x-0 top-2 mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0"
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={activeIndex >= shorts.length - 1}
                    title="Próximo vídeo"
                    aria-label="Próximo vídeo"
                    className="pointer-events-auto absolute inset-x-0 bottom-24 mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-0"
                  >
                    <ChevronDownIcon />
                  </button>

                  <div className="pointer-events-auto absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-4">
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
                      aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
                        favorite ? 'bg-violet-600' : 'bg-black/50 hover:bg-black/70'
                      }`}
                    >
                      <StarIcon filled={favorite} />
                    </button>
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      title={paused ? 'Reproduzir' : 'Pausar'}
                      aria-label={paused ? 'Reproduzir' : 'Pausar'}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <PlayPauseIcon paused={paused} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMuted((m) => !m)}
                      title={muted ? 'Ativar som' : 'Silenciar'}
                      aria-label={muted ? 'Ativar som' : 'Silenciar'}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <MuteIcon muted={muted} />
                    </button>
                    {catalogIdsRef.current.has(activeVideo.id) && (
                      <button
                        type="button"
                        onClick={handleDeleteActive}
                        title="Excluir da lista"
                        aria-label="Excluir da lista"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </>
              )}

              {loadingMore && (
                <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-neutral-400">
                  Carregando mais…
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}