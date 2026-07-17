import { useEffect, useRef, useState } from 'react'
import type { HistoryEntry, Video } from '../types'
import VideoCard from './VideoCard'
import { 
  getTopCategories, 
  listHistory, 
  recordInterest, 
  removeFromCatalog,
  refreshCatalog,
  invalidateCatalogCaches,
  debugCatalog
} from '../lib/db'
import { categorize } from '../lib/categories'
import { expandSearchTerm } from '../lib/aiSearch'
import { getSuggestions } from '../lib/searchSuggest'
import { extractVideoId, getVideoById, getVideosByIds, hasApiKey, searchVideosPage, YoutubeApiError } from '../lib/youtube'
import { QUOTA_EXCEEDED_MESSAGE } from '../lib/youtubeCache'
import { RECOMMENDED_VIDEO_IDS } from '../config/recommendedVideos'
import { HOME_QUERIES as QUERIES } from '../lib/discoveryQueries'

interface Props {
  onSelect: (video: Video, queue?: Video[]) => void
}

// Cache curto em memória
let cachedVideos: Video[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000
let forceRefreshCache = true // Sempre refresh ao montar pela primeira vez

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
  // Catálogo salvo e vídeos da API
  const [catalogVideos, setCatalogVideos] = useState<Video[]>([])
  const [apiVideos, setApiVideos] = useState<Video[]>([])
  const [order, setOrder] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Rolagem infinita
  const seenIdsRef = useRef(new Set<string>())
  const shuffledQueriesRef = useRef<string[]>([...QUERIES])
  const pageTokensRef = useRef<Record<string, string | undefined>>({})
  const exhaustedRef = useRef(new Set<string>())
  const queryTurnRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  
  // Categorias de interesse
  const topCategoriesRef = useRef<string[]>([])

  // Busca inteligente
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Histórico
  const historyRef = useRef<HistoryEntry[]>([])
  
  // Estado da busca
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<Video[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchLoadingMore, setSearchLoadingMore] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const searchTokenRef = useRef<string | undefined>(undefined)
  const searchSeenRef = useRef(new Set<string>())
  const searchSentinelRef = useRef<HTMLDivElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  // ============================================================
  // 🔥 INICIALIZAÇÃO COM REFRESH FORÇADO
  // ============================================================
  useEffect(() => {
    // 🔥 Força limpeza de caches do catálogo
    invalidateCatalogCaches()
    
    // 🔥 Usa refreshCatalog() em vez de listCatalog() para garantir dados frescos
    refreshCatalog()
      .catch(() => [])
      .then((videos) => {
        setCatalogVideos(videos)
        // 🔥 LIMPA seenIds ANTES de adicionar os novos
        seenIdsRef.current = new Set()
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

    // 🔥 Verifica se deve usar cache ou forçar refresh
    const shouldUseCache = !forceRefreshCache && cachedVideos && Date.now() - cachedAt < CACHE_TTL_MS
    
    if (shouldUseCache && cachedVideos) {
      setApiVideos(cachedVideos)
      cachedVideos.forEach((v) => seenIdsRef.current.add(v.id))
      return
    }

    // 🔥 Se forceRefreshCache estiver ativo, limpa e recarrega
    if (forceRefreshCache) {
      cachedVideos = null
      cachedAt = 0
      forceRefreshCache = false
    }

    fetchInitial().then((videos) => {
      if (videos) {
        setApiVideos(videos)
        videos.forEach((v) => seenIdsRef.current.add(v.id))
      }
    })
  }, [])

  // ============================================================
  // 🔥 DETECTA MUDANÇAS NO CATÁLOGO
  // ============================================================
  useEffect(() => {
    const reloadCatalog = async () => {
      try {
        const freshCatalog = await refreshCatalog()
        setCatalogVideos(freshCatalog)
        freshCatalog.forEach((v) => seenIdsRef.current.add(v.id))
      } catch (error) {
        console.error('❌ Erro ao recarregar catálogo:', error)
      }
    }

    // Verifica mudanças a cada 3 segundos
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshCatalog()
          .then((currentCatalog) => {
            const currentIds = new Set(catalogVideos.map(v => v.id))
            const newIds = new Set(currentCatalog.map(v => v.id))
            
            let hasChanged = false
            if (currentIds.size !== newIds.size) {
              hasChanged = true
            } else {
              for (const id of currentIds) {
                if (!newIds.has(id)) {
                  hasChanged = true
                  break
                }
              }
            }
            
            if (hasChanged) {
              reloadCatalog()
            }
          })
          .catch(() => {})
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [catalogVideos])

  // ============================================================
  // 🔥 REORDENAÇÃO COM LIMPEZA
  // ============================================================
  useEffect(() => {
    setOrder((current) => {
      const all = [...catalogVideos, ...apiVideos]
      
      if (all.length === 0) {
        return []
      }
      
      const validIds = new Set(all.map(v => v.id))
      const filteredCurrent = current.filter(id => validIds.has(id))
      const known = new Set(filteredCurrent)
      const fresh = all.filter((v) => !known.has(v.id))
      
      if (fresh.length === 0) {
        return filteredCurrent
      }
      
      const top = topCategoriesRef.current
      const prioritizedIds = new Set(
        top.length > 0
          ? fresh.filter((v) => categorize(`${v.title} ${v.channelTitle}`).some((c) => top.includes(c))).map((v) => v.id)
          : [],
      )
      const prioritized = fresh.filter((v) => prioritizedIds.has(v.id)).map((v) => v.id)
      const rest = fresh.filter((v) => !prioritizedIds.has(v.id)).map((v) => v.id)
      
      return [...filteredCurrent, ...shuffle(prioritized), ...shuffle(rest)]
    })
  }, [catalogVideos, apiVideos])

  // ============================================================
  // 🔥 BUSCA INICIAL
  // ============================================================
  async function fetchInitial(): Promise<Video[] | null> {
    try {
      if (forceRefreshCache) {
        cachedVideos = null
        cachedAt = 0
        forceRefreshCache = false
      }

      if (RECOMMENDED_VIDEO_IDS.length > 0) {
        const recommended = await getVideosByIds(RECOMMENDED_VIDEO_IDS)
        if (recommended.length > 0) {
          recommended.forEach((v) => seenIdsRef.current.add(v.id))
          cachedVideos = recommended
          cachedAt = Date.now()
          return recommended
        }
      }

      // Embaralha para variar o feed a cada sessão
      const shuffled = [...QUERIES].sort(() => Math.random() - 0.5)

      // Prioriza queries do histórico do usuário
      const historyTerms = historyRef.current.slice(0, 10).map((h) => h.title?.toLowerCase() ?? '')
      if (historyTerms.length > 0) {
        shuffled.sort((a, b) => {
          const aHit = historyTerms.some((t) => a.toLowerCase().includes(t) || t.includes(a.toLowerCase()))
          const bHit = historyTerms.some((t) => b.toLowerCase().includes(t) || t.includes(b.toLowerCase()))
          return (aHit ? -1 : 0) - (bHit ? -1 : 0)
        })
      }

      // Salva ordem embaralhada para o loadMore continuar de onde parou
      shuffledQueriesRef.current = shuffled

      // Apenas 2 queries no início para não estourar cota
      const initialQueries = shuffled.slice(0, 2)
      queryTurnRef.current = 2

      const results = await Promise.allSettled(
        initialQueries.map((q) => searchVideosPage(q, undefined, 'date'))
      )

      const allVideos: Video[] = []
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const q = initialQueries[i]
          pageTokensRef.current[q] = result.value.nextPageToken
          result.value.videos.forEach((v) => {
            if (!seenIdsRef.current.has(v.id)) {
              seenIdsRef.current.add(v.id)
              allVideos.push(v)
            }
          })
        }
      })

      cachedVideos = allVideos
      cachedAt = Date.now()
      return allVideos
    } catch (err) {
      setError(err instanceof YoutubeApiError ? err.message : null)
      return null
    }
  }

  // ============================================================
  // 🔥 LOAD MORE
  // ============================================================
  async function loadMore() {
    if (!hasApiKey() || loadingMore || exhaustedRef.current.size >= shuffledQueriesRef.current.length) return
    let query: string | undefined
    for (let i = 0; i < QUERIES.length; i++) {
      const candidate = shuffledQueriesRef.current[queryTurnRef.current % shuffledQueriesRef.current.length]
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
  }, [loadingMore])

  // ============================================================
  // 🔥 REFRESH MANUAL
  // ============================================================
  async function handleRefresh() {
    if (!hasApiKey() || refreshing) return
    setRefreshing(true)
    setError(null)
    // 1. Invalida todos os caches
    invalidateCatalogCaches()
    
    // 2. Limpa cache da API e força refresh
    forceRefreshCache = true
    cachedVideos = null
    cachedAt = 0
    
    // 3. Limpa seenIds
    seenIdsRef.current = new Set()
    
    // 4. Recarrega o catálogo
    try {
      const freshCatalog = await refreshCatalog()
      setCatalogVideos(freshCatalog)
      freshCatalog.forEach((v) => seenIdsRef.current.add(v.id))
    } catch (error) {
      console.error('❌ Erro ao recarregar catálogo:', error)
    }
    
    // 5. Reseta tokens
    pageTokensRef.current = {}
    exhaustedRef.current.clear()
    queryTurnRef.current = 0
    
    // 6. Busca novos vídeos
    const videos = await fetchInitial()
    if (videos) {
      setApiVideos(videos)
      videos.forEach((v) => seenIdsRef.current.add(v.id))
    }
    
    // 7. Força reordenação
    setOrder([])
    
    setRefreshing(false)
  }

  async function handleDeleteFromCatalog(video: Video) {
    await removeFromCatalog(video.id)
    setCatalogVideos((current) => {
      const updated = current.filter((v) => v.id !== video.id)
      seenIdsRef.current.delete(video.id)
      return updated
    })
  }

  // ============================================================
  // 🔥 AUTOCOMPLETE
  // ============================================================
  useEffect(() => {
    const value = input.trim()
    if (value.length < 3 || extractVideoId(value)) {
      setSuggestions([])
      setSuggestLoading(false)
      return
    }
    let active = true
    setSuggestLoading(true)
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

  // ============================================================
  // 🔥 BUSCA
  // ============================================================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await runSearch(input)
  }

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

  // ============================================================
  // 🔥 RENDER
  // ============================================================
  const catalogIds = new Set(catalogVideos.map((v) => v.id))
  const byId = new Map([...catalogVideos, ...apiVideos].map((v) => [v.id, v]))
  const videos = order.map((id) => byId.get(id)!).filter(Boolean)

  // Debug em desenvolvimento
  useEffect(() => {
    if (import.meta.env.DEV) {
      debugCatalog().catch(() => {})
    }
  }, [])

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      {/* BUSCA */}
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

      {/* STATUS DA BUSCA */}
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

      {/* RESULTADOS DA BUSCA */}
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

      {/* FEED PRINCIPAL */}
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