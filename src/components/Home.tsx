import { useEffect, useRef, useState } from 'react'
import type { HistoryEntry, Video } from '../types'
import VideoCard from './VideoCard'
import { getTopCategories, listCatalog, listHistory, recordInterest, removeFromCatalog } from '../lib/db'
import { categorize } from '../lib/categories'
import { expandSearchTerm } from '../lib/aiSearch'
import { getSuggestions } from '../lib/searchSuggest'
import { extractVideoId, getVideoById, getVideosByIds, hasApiKey, searchVideosPage, YoutubeApiError } from '../lib/youtube'
import { QUOTA_EXCEEDED_MESSAGE } from '../lib/youtubeCache'
import { RECOMMENDED_VIDEO_IDS } from '../config/recommendedVideos'
import { DISCOVERY_QUERIES as QUERIES } from '../lib/discoveryQueries'

interface Props {
  onSelect: (video: Video, queue?: Video[]) => void
}

// Cache curto em memória: sem isso, cada vez que o usuário voltava
// para "Início" — a aba padrão — o app disparava buscas novas, mesmo
// trocando de aba e voltando em segundos. Isso esgotava o limite de
// requisições da API rápido, causando erro 403/429 em outras telas
// (como Shorts) depois de pouco uso. 5 minutos segura esse limite sem
// deixar o feed velho — a ordem também muda a cada visita, e dá pra
// forçar vídeos novos na hora com o botão "Atualizar".
let cachedVideos: Video[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 11A8 8 0 1 0 18.5 15.5M20 5v6h-6" />
    </svg>
  )
}

export default function Home({ onSelect }: Props) {
  // Catálogo salvo (local, sem custo de cota) e vídeos da API ficam em
  // estados separados — assim dá pra saber quais cartões têm lixeira
  // (só os salvos) e "Atualizar" não perde o que já carregou.
  const [catalogVideos, setCatalogVideos] = useState<Video[]>([])
  const [apiVideos, setApiVideos] = useState<Video[]>([])
  const [order, setOrder] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rolagem infinita do feed geral: gira entre as consultas fixas,
  // guardando o nextPageToken de cada uma — nunca fica sem vídeo novo
  // enquanto pelo menos uma consulta ainda tiver páginas.
  const seenIdsRef = useRef(new Set<string>())
  const pageTokensRef = useRef<Record<string, string | undefined>>({})
  const exhaustedRef = useRef(new Set<string>())
  const queryTurnRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  
  // Categorias com maior pontuação de interesse (item 3, recomendação
  // por histórico) — carregadas uma vez do IndexedDB e usadas para
  // priorizar novos vídeos que entram no feed, sem precisar re-renderizar
  // por causa disso (fica num ref, não em state).
  const topCategoriesRef = useRef<string[]>([])

  // Busca inteligente (autocomplete + resultados)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Histórico de vídeos assistidos (item 3), corpus da Fonte 1 do
  // autocomplete.
  const historyRef = useRef<HistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Video[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const searchTokenRef = useRef<string | undefined>(undefined)
  const searchSeenRef = useRef(new Set<string>())
  const searchSentinelRef = useRef<HTMLDivElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // O catálogo salvo é local e sempre disponível
    listCatalog()
      .catch(() => [])
      .then((videos) => {
        setCatalogVideos(videos)
        videos.forEach((v) => seenIdsRef.current.add(v.id))
        setLoading(false)
      })

    getTopCategories(5)
      .catch(() => [])
      .then((categories) => {
        topCategoriesRef.current = categories
      })

    listHistory()
      .catch(() => [])
      .then((h) => {
        historyRef.current = h
      })

    if (!hasApiKey()) return

    if (cachedVideos && Date.now() - cachedAt < CACHE_TTL_MS) {
      setApiVideos(cachedVideos)
      cachedVideos.forEach((v) => seenIdsRef.current.add(v.id))
      return
    }

    fetchInitial().then((videos) => {
      if (videos) setApiVideos(videos)
    })
  }, [])

  // Embaralha de novo toda vez que a lista de vídeos disponíveis muda
  useEffect(() => {
    setOrder((current) => {
      const all = [...catalogVideos, ...apiVideos]
      const known = new Set(current)
      const fresh = all.filter((v) => !known.has(v.id))
      const top = topCategoriesRef.current
      const prioritizedIds = new Set(
        top.length > 0
          ? fresh.filter((v) => categorize(`${v.title} ${v.channelTitle}`).some((c) => top.includes(c))).map((v) => v.id)
          : [],
      )
      const prioritized = fresh.filter((v) => prioritizedIds.has(v.id)).map((v) => v.id)
      const rest = fresh.filter((v) => !prioritizedIds.has(v.id)).map((v) => v.id)
      return [...current, ...shuffle(prioritized), ...shuffle(rest)]
    })
  }, [catalogVideos, apiVideos])

  // Abordagem híbrida (custo de cota)
  async function fetchInitial(): Promise<Video[] | null> {
    try {
      if (RECOMMENDED_VIDEO_IDS.length > 0) {
        const recommended = await getVideosByIds(RECOMMENDED_VIDEO_IDS)
        if (recommended.length > 0) {
          recommended.forEach((v) => seenIdsRef.current.add(v.id))
          cachedVideos = recommended
          cachedAt = Date.now()
          return recommended
        }
      }
      
      const q = QUERIES[0]
      const page = await searchVideosPage(q, undefined, 'date')
      pageTokensRef.current[q] = page.nextPageToken
      page.videos.forEach((v) => seenIdsRef.current.add(v.id))
      cachedVideos = page.videos
      cachedAt = Date.now()
      return page.videos
    } catch (err) {
      setError(err instanceof YoutubeApiError ? err.message : null)
      return null
    }
  }

  // Busca a próxima página de uma das consultas (revezando entre elas)
  async function loadMore() {
    if (!hasApiKey() || loadingMore || exhaustedRef.current.size >= QUERIES.length) return
    let query: string | undefined
    for (let i = 0; i < QUERIES.length; i++) {
      const candidate = QUERIES[queryTurnRef.current % QUERIES.length]
      queryTurnRef.current += 1
      if (!exhaustedRef.current.has(candidate)) {
        query = candidate
        break
      }
    }
    if (!query) return

    setLoadingMore(true)
    try {
      const token = pageTokensRef.current[query]
      const page = await searchVideosPage(query, token, 'date')
      pageTokensRef.current[query] = page.nextPageToken
      if (!page.nextPageToken) exhaustedRef.current.add(query)
      const fresh = page.videos.filter((v) => !seenIdsRef.current.has(v.id))
      fresh.forEach((v) => seenIdsRef.current.add(v.id))
      if (fresh.length > 0) setApiVideos((current) => [...current, ...fresh])
    } catch {
      exhaustedRef.current.add(query)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!hasApiKey()) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore])

  // Botão "Atualizar"
  async function handleRefresh() {
    if (!hasApiKey() || refreshing) return
    setRefreshing(true)
    setError(null)
    pageTokensRef.current = {}
    exhaustedRef.current.clear()
    queryTurnRef.current = 0
    const videos = await fetchInitial()
    if (videos) setApiVideos(videos)
    setRefreshing(false)
  }

  async function handleDeleteFromCatalog(video: Video) {
    await removeFromCatalog(video.id)
    setCatalogVideos((current) => current.filter((v) => v.id !== video.id))
  }

  // Autocomplete inteligente
  useEffect(() => {
    const value = input.trim()
    if (value.length < 3 || extractVideoId(value)) {
      setSuggestions([])
      setSuggestLoading(false)
      return
    }
    let active = true
    setSuggestLoading(true)
    // Debounce de 300ms
    const timer = setTimeout(() => {
      getSuggestions(value, historyRef.current, hasApiKey())
        .then((terms) => {
          if (active) setSuggestions(terms)
        })
        .catch(() => {
          if (active) setSuggestions([])
        })
        .finally(() => {
          if (active) setSuggestLoading(false)
        })
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [input])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await runSearch(input)
  }

  // Executa a busca de um termo
  async function runSearch(rawValue: string) {
    const value = rawValue.trim()
    if (!value) return

    const id = extractVideoId(value)
    setSearchLoading(true)
    setSearchStatus(null)
    setSearchResults(null)
    setSearchQuery(null)
    setShowSuggestions(false)

    try {
      if (id) {
        const video = hasApiKey()
          ? await getVideoById(id)
          : { id, title: id, channelTitle: '', thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` }
        if (!video) {
          setSearchStatus('Vídeo não encontrado.')
          return
        }
        onSelect(video)
        setInput('')
      } else if (hasApiKey()) {
        recordInterest(categorize(value)).catch(() => {})
        // Expande o termo em sinônimos via IA e combina tudo com OR
        const extraTerms = await expandSearchTerm(value)
        const combinedQuery = extraTerms.length > 0 ? [value, ...extraTerms].join('|') : value
        searchSeenRef.current = new Set()
        const page = await searchVideosPage(combinedQuery)
        page.videos.forEach((v) => searchSeenRef.current.add(v.id))
        searchTokenRef.current = page.nextPageToken
        setSearchResults(page.videos)
        setSearchQuery(combinedQuery)
      } else {
        setSearchStatus(
          'Isso não parece um link do YouTube. Para buscar por texto, a busca precisa estar configurada.',
        )
      }
    } catch (err) {
      setSearchStatus(err instanceof YoutubeApiError ? err.message : 'Algo deu errado.')
    } finally {
      setSearchLoading(false)
    }
  }

  // Mais resultados da mesma busca
  async function loadMoreSearch() {
    if (!searchQuery || !searchTokenRef.current || searchLoadingMore) return
    setSearchLoadingMore(true)
    try {
      const page = await searchVideosPage(searchQuery, searchTokenRef.current)
      searchTokenRef.current = page.nextPageToken
      const fresh = page.videos.filter((v) => !searchSeenRef.current.has(v.id))
      fresh.forEach((v) => searchSeenRef.current.add(v.id))
      if (fresh.length > 0) setSearchResults((current) => [...(current ?? []), ...fresh])
    } catch {
      searchTokenRef.current = undefined
    } finally {
      setSearchLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!searchQuery) return
    const el = searchSentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreSearch()
      },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchLoadingMore])

  function handleSelectSuggestion(term: string) {
    setShowSuggestions(false)
    setInput(term)
    runSearch(term)
  }

  function handleClearSearch() {
    setSearchResults(null)
    setSearchQuery(null)
    setSearchStatus(null)
    setInput('')
  }

  const catalogIds = new Set(catalogVideos.map((v) => v.id))
  const byId = new Map([...catalogVideos, ...apiVideos].map((v) => [v.id, v]))
  const videos = order.map((id) => byId.get(id)!).filter(Boolean)

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      <div ref={boxRef} className="relative mx-auto mb-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              setShowSuggestions(true)
              listHistory()
                .catch(() => [])
                .then((h) => {
                  historyRef.current = h
                })
            }}
            placeholder={
              hasApiKey() ? 'Buscar ou colar link de vídeo do YouTube' : 'Colar link de vídeo do YouTube'
            }
            autoComplete="off"
            className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 shadow-sm focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400"
          />
          <button
            type="submit"
            disabled={searchLoading}
            aria-label="Buscar ou assistir"
            title="Buscar ou assistir"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <SearchIcon />
          </button>
        </form>

        {showSuggestions && (suggestLoading || suggestions.length > 0) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {suggestLoading && suggestions.length === 0 && (
              <p className="p-3 text-sm text-neutral-500 dark:text-neutral-400">Buscando sugestões…</p>
            )}
            {suggestions.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleSelectSuggestion(term)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <span className="shrink-0 text-neutral-400 dark:text-neutral-500">
                  <SearchIcon />
                </span>
                <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-100">
                  {term}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {searchStatus && (
        <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-300">
          {searchStatus}
        </p>
      )}

      {searchLoading && !searchResults && (
        <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-neutral-500 dark:text-neutral-400">
          Buscando…
        </p>
      )}

      {searchResults && (
        <section className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Resultados da busca</h2>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-sm text-violet-600 underline hover:text-violet-700 dark:text-violet-400"
            >
              Fechar busca
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum vídeo encontrado.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {searchResults.map((v) => (
                  <VideoCard key={v.id} video={v} onSelect={onSelect} />
                ))}
              </div>
              <div ref={searchSentinelRef} className="h-4" />
              {searchLoadingMore && (
                <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Carregando mais resultados…
                </p>
              )}
            </>
          )}
        </section>
      )}

      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{searchResults ? 'Mais vídeos' : 'Início'}</h2>
        {hasApiKey() && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshIcon />
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
        )}
      </div>
      {loading && videos.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Carregando…</p>
      )}
      {error && videos.length === 0 && (
        <p
          className={
            error === QUOTA_EXCEEDED_MESSAGE
              ? 'text-sm text-neutral-500 dark:text-neutral-400'
              : 'text-sm text-red-600 dark:text-red-400'
          }
        >
          {error}
        </p>
      )}
      {!loading && !error && videos.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhum vídeo por aqui ainda. Busque acima ou adicione vídeos em "Meus Canais" para começar.
        </p>
      )}
      {videos.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {videos.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                onSelect={(video) => onSelect(video, videos.filter((sv) => sv.id !== video.id))}
                onDelete={catalogIds.has(v.id) ? handleDeleteFromCatalog : undefined}
              />
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Carregando mais vídeos…
            </p>
          )}
        </>
      )}
    </div>
  )
}