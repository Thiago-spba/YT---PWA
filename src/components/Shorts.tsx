import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import {
  isFavorite,
  listCatalog,
  recordHistory,
  removeFromCatalog,
  toggleFavorite,
  updateCatalogVideoFlags,
} from '../lib/db'
import { getVideoFlags, hasApiKey, searchShortsPage, YoutubeApiError } from '../lib/youtube'
import { loadYouTubeApi, type YTPlayer } from '../lib/youtubePlayer'
import { DISCOVERY_QUERIES } from '../lib/discoveryQueries'

// Cache curto (mesma ideia da Início): sem isso, reabrir a aba Shorts
// disparava buscas novas toda vez, gastando requisições à toa.
let cachedDiscovery: Video[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
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

const checkedIdsThisSession = new Set<string>()

export default function Shorts() {
  // Feed geral (catálogo + descoberta) e resultado de busca ficam
  // separados — `shorts` (abaixo) é sempre "o que está sendo exibido
  // agora", trocando sozinho entre os dois. Isso deixa a busca usar
  // exatamente a mesma rolagem vertical com favoritar/mudo/lixeira do
  // feed normal, em vez de uma grade à parte sem esses controles.
  const [feedShorts, setFeedShorts] = useState<Video[]>([])
  const [searchFeed, setSearchFeed] = useState<Video[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)
  const [favorite, setFavorite] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const catalogIdsRef = useRef(new Set<string>())
  const seenIdsRef = useRef(new Set<string>())
  const pageTokensRef = useRef<Record<string, string | undefined>>({})
  const exhaustedRef = useRef(new Set<string>())
  const queryTurnRef = useRef(0)
  const searchQueryRef = useRef<string | null>(null)
  const searchTokenRef = useRef<string | undefined>(undefined)
  const searchSeenRef = useRef(new Set<string>())
  const lastFeedActiveIdRef = useRef<string | null>(null)

  const shorts = searchFeed ?? feedShorts

  // Vídeos adicionados antes da checagem de duração existir (ou sem a
  // chave de API configurada na hora) ficam com isShort indefinido e
  // nunca apareciam aqui. Ao entrar na aba, confirma a duração desses
  // itens em lote e "preenche" o catálogo, sem custo extra de API para
  // quem já tem isShort definido.
  useEffect(() => {
    listCatalog().then(async (all) => {
      const onlyShorts = all.filter((v) => v.isShort)
      onlyShorts.forEach((v) => {
        catalogIdsRef.current.add(v.id)
        seenIdsRef.current.add(v.id)
      })
      setFeedShorts(onlyShorts)
      if (onlyShorts.length > 0) setActiveId(onlyShorts[0].id)
      setLoaded(true)

      // Feed de descoberta: sem isso, quem não importa/adiciona nada
      // manualmente nunca via nada aqui. Usa cache curto (mesma ideia
      // da Início) pra não reabrir a busca toda vez que a aba é aberta.
      if (hasApiKey()) {
        if (cachedDiscovery && Date.now() - cachedAt < CACHE_TTL_MS) {
          mergeDiscovery(cachedDiscovery, onlyShorts.length === 0)
        } else {
          loadDiscovery(onlyShorts.length === 0)
        }
      }

      // Só tenta cada vídeo uma vez por sessão: reabrir a aba Shorts
      // remonta este componente, e sem essa guarda a mesma checagem em
      // lote era refeita toda vez — combinada com outras buscas do app,
      // isso estourava o limite de requisições por período da API do
      // YouTube (erro 429), mesmo sem ter estourado a cota diária.
      const unknown = all.filter((v) => v.isShort === undefined && !checkedIdsThisSession.has(v.id))
      if (unknown.length === 0 || !hasApiKey()) return
      unknown.forEach((v) => checkedIdsThisSession.add(v.id))
      try {
        const flags = await getVideoFlags(unknown.map((v) => v.id))
        const updates = unknown
          .filter((v) => flags[v.id])
          .map((v) => ({ id: v.id, isShort: flags[v.id].isShort, durationSeconds: flags[v.id].durationSeconds }))
        if (updates.length === 0) return
        await updateCatalogVideoFlags(updates)
        const newlyShort = unknown
          .filter((v) => flags[v.id]?.isShort)
          .map((v) => ({ ...v, isShort: true, durationSeconds: flags[v.id].durationSeconds }))
        if (newlyShort.length > 0) {
          newlyShort.forEach((v) => catalogIdsRef.current.add(v.id))
          setFeedShorts((current) => [...current, ...newlyShort.filter((v) => !seenIdsRef.current.has(v.id))])
          newlyShort.forEach((v) => seenIdsRef.current.add(v.id))
          setActiveId((current) => current ?? newlyShort[0].id)
        }
      } catch {
        // Checagem em segundo plano é best-effort — falha aqui não impede o uso da aba.
      }
    })
  }, [])

  // Só a primeira consulta ao abrir a aba — buscar as 3 de uma vez
  // (mais a checagem de duração de cada uma) é muita requisição junto,
  // exatamente o tipo de rajada que derruba a API com erro 429. As
  // outras 2 consultas entram aos poucos, conforme rola (loadMore).
  async function fetchDiscovery(): Promise<Video[] | null> {
    try {
      const q = DISCOVERY_QUERIES[0]
      const page = await searchShortsPage(q)
      pageTokensRef.current[q] = page.nextPageToken
      cachedDiscovery = page.videos
      cachedAt = Date.now()
      return page.videos
    } catch (err) {
      setDiscoveryError(err instanceof YoutubeApiError ? err.message : 'Erro ao buscar vídeos.')
      return null
    }
  }

  function mergeDiscovery(videos: Video[], activateFirst: boolean) {
    const fresh = videos.filter((v) => !seenIdsRef.current.has(v.id))
    fresh.forEach((v) => seenIdsRef.current.add(v.id))
    if (fresh.length > 0) {
      setFeedShorts((current) => [...current, ...fresh])
      if (activateFirst) setActiveId((current) => current ?? fresh[0].id)
    }
  }

  async function loadDiscovery(activateFirst: boolean) {
    setDiscoveryError(null)
    const videos = await fetchDiscovery()
    if (videos) mergeDiscovery(videos, activateFirst)
  }

  // Busca mais uma página quando o usuário está chegando perto do fim
  // da lista já carregada — da busca ativa, se houver uma, senão do
  // feed geral (revezando entre as consultas de descoberta).
  async function loadMore() {
    if (!hasApiKey() || loadingMore) return

    if (searchFeed !== null) {
      if (!searchTokenRef.current || !searchQueryRef.current) return
      setLoadingMore(true)
      try {
        const page = await searchShortsPage(searchQueryRef.current, searchTokenRef.current)
        searchTokenRef.current = page.nextPageToken
        const fresh = page.videos.filter((v) => !searchSeenRef.current.has(v.id))
        fresh.forEach((v) => searchSeenRef.current.add(v.id))
        if (fresh.length > 0) setSearchFeed((current) => [...(current ?? []), ...fresh])
      } catch {
        searchTokenRef.current = undefined
      } finally {
        setLoadingMore(false)
      }
      return
    }

    if (exhaustedRef.current.size >= DISCOVERY_QUERIES.length) return
    let q: string | undefined
    for (let i = 0; i < DISCOVERY_QUERIES.length; i++) {
      const candidate = DISCOVERY_QUERIES[queryTurnRef.current % DISCOVERY_QUERIES.length]
      queryTurnRef.current += 1
      if (!exhaustedRef.current.has(candidate)) {
        q = candidate
        break
      }
    }
    if (!q) return

    setLoadingMore(true)
    try {
      const token = pageTokensRef.current[q]
      const page = await searchShortsPage(q, token)
      pageTokensRef.current[q] = page.nextPageToken
      if (!page.nextPageToken) exhaustedRef.current.add(q)
      const fresh = page.videos.filter((v) => !seenIdsRef.current.has(v.id))
      fresh.forEach((v) => seenIdsRef.current.add(v.id))
      if (fresh.length > 0) setFeedShorts((current) => [...current, ...fresh])
    } catch {
      exhaustedRef.current.add(q)
    } finally {
      setLoadingMore(false)
    }
  }

  // Player único, criado uma vez. Trocar de short só chama loadVideoById
  // na mesma instância — o mesmo padrão usado em Watch.tsx.
  useEffect(() => {
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current) return
      playerRef.current = new YT.Player(playerContainerRef.current, {
        videoId: shorts[0]?.id ?? '',
        host: 'https://www.youtube-nocookie.com',
        width: '100%',
        height: '100%',
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
      setFeedShorts(removeFromList)
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
          {searchFeed !== null && (
            <button
              type="button"
              onClick={handleExitSearch}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm text-neutral-300 hover:text-white"
            >
              Voltar
            </button>
          )}
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
                onClick={() => loadDiscovery(true)}
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
