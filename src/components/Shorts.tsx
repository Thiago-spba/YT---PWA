import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { addToCatalog, isFavorite, listCatalog, recordHistory, toggleFavorite } from '../lib/db'
import { hasApiKey, searchShorts, YoutubeApiError } from '../lib/youtube'
import { loadYouTubeApi, type YTPlayer } from '../lib/youtubePlayer'

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
  registerRef: (id: string, el: HTMLDivElement | null) => void
  onVisible: () => void
}

/**
 * Cada item da lista é só uma miniatura — nunca monta player próprio.
 * Isso evita que o React tente desmontar um nó de DOM que a API do
 * YouTube já substituiu por fora (erro "removeChild" visto no teste).
 * Quem toca o vídeo é o player único e persistente, sobreposto por
 * cima do item ativo (ver `Shorts`, mais abaixo).
 */
function ShortThumb({ video, isActive, registerRef, onVisible }: ThumbProps) {
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
    <div ref={ref} className="relative flex h-full w-full snap-start items-center justify-center">
      <div className="relative h-full max-h-full aspect-[9/16] max-w-full overflow-hidden bg-neutral-900">
        <img
          src={video.thumbnailUrl}
          alt=""
          className={`h-full w-full object-cover transition-opacity ${isActive ? 'opacity-0' : 'opacity-100'}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
          <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
          <p className="text-xs text-neutral-300">{video.channelTitle}</p>
        </div>
      </div>
    </div>
  )
}

export default function Shorts() {
  const [shorts, setShorts] = useState<Video[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)
  const [favorite, setFavorite] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Video[] | null>(null)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    listCatalog().then((all) => {
      const onlyShorts = all.filter((v) => v.isShort)
      setShorts(onlyShorts)
      if (onlyShorts.length > 0) setActiveId(onlyShorts[0].id)
      setLoaded(true)
    })
  }, [])

  // Player único, criado uma vez. Trocar de short só chama loadVideoById
  // na mesma instância — o mesmo padrão usado em Watch.tsx.
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return
      playerRef.current = new YT.Player(playerContainerRef.current, {
        videoId: shorts[0]?.id ?? '',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, autoplay: 1, controls: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true
            playerRef.current?.mute()
          },
          onStateChange: (e) => {
            // 0 = terminou: reinicia o mesmo short (efeito "loop").
            if (e.data === 0) playerRef.current?.playVideo()
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
    recordHistory(video)
    isFavorite(video.id).then(setFavorite)

    function load() {
      playerRef.current?.loadVideoById(activeId!)
      if (muted) playerRef.current?.mute()
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
    if (muted) playerRef.current?.mute()
    else playerRef.current?.unMute()
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

  function handlePrev() {
    if (activeIndex > 0) scrollToId(shorts[activeIndex - 1].id)
  }

  function handleNext() {
    if (activeIndex >= 0 && activeIndex < shorts.length - 1) {
      scrollToId(shorts[activeIndex + 1].id)
    }
  }

  async function handleToggleFavorite() {
    if (!activeVideo) return
    setFavorite(await toggleFavorite(activeVideo))
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearching(true)
    setSearchStatus(null)
    try {
      const results = await searchShorts(value)
      setSearchResults(results)
      if (results.length === 0) {
        setSearchStatus('Nenhum vídeo curto encontrado para essa busca.')
      }
    } catch (err) {
      setSearchStatus(err instanceof YoutubeApiError ? err.message : 'Erro ao buscar.')
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }

  async function handleAddResult(video: Video) {
    await addToCatalog(video)
    setShorts((current) => [video, ...current.filter((v) => v.id !== video.id)])
    setActiveId(video.id)
    setSearchResults(null)
    setQuery('')
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col bg-black">
      {hasApiKey() && (
        <form onSubmit={handleSearch} className="flex shrink-0 items-center gap-2 border-b border-neutral-800 p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vídeos curtos"
            className="flex-1 rounded-full border border-neutral-700 bg-neutral-900 px-4 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            aria-label="Buscar"
            title="Buscar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <SearchIcon />
          </button>
          {searchResults !== null && (
            <button
              type="button"
              onClick={() => {
                setSearchResults(null)
                setSearchStatus(null)
                setQuery('')
              }}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm text-neutral-300 hover:text-white"
            >
              Voltar
            </button>
          )}
        </form>
      )}

      {searchStatus && <p className="shrink-0 p-3 text-center text-sm text-neutral-300">{searchStatus}</p>}
      {searching && <p className="shrink-0 p-3 text-center text-sm text-neutral-400">Buscando…</p>}

      {searchResults && searchResults.length > 0 ? (
        <div className="grid flex-1 grid-cols-3 gap-1 overflow-y-auto p-1 sm:grid-cols-4 md:grid-cols-5">
          {searchResults.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleAddResult(v)}
              className="relative aspect-[9/16] overflow-hidden rounded bg-neutral-900"
            >
              <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-left text-[11px] text-white line-clamp-2">
                {v.title}
              </span>
            </button>
          ))}
        </div>
      ) : loaded && shorts.length === 0 ? (
        <div className="mx-auto max-w-md flex-1 p-8 text-center text-sm text-neutral-400">
          Nenhum vídeo curto no catálogo ainda. Busque acima, adicione pelo Catálogo, ou importe
          da sua conta Google — vídeos de até 1 minuto aparecem aqui automaticamente.
        </div>
      ) : (
        <div className="relative flex-1">
          <div className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll">
            {shorts.map((v) => (
              <ShortThumb
                key={v.id}
                video={v}
                isActive={v.id === activeId}
                registerRef={registerRef}
                onVisible={() => setActiveId(v.id)}
              />
            ))}
          </div>

          {/* Player único sobreposto — sempre na mesma posição da tela,
              que é exatamente onde o item ativo já preenche a viewport
              por causa do scroll-snap. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-full max-h-full aspect-[9/16] max-w-full">
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
                      onClick={() => setMuted((m) => !m)}
                      title={muted ? 'Ativar som' : 'Silenciar'}
                      aria-label={muted ? 'Ativar som' : 'Silenciar'}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <MuteIcon muted={muted} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
