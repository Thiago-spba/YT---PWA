import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { listCatalog, updateCatalogVideoFlags } from './db'
import { getVideoFlags, hasApiKey, searchShortsPage, YoutubeApiError } from './youtube'
import { DISCOVERY_QUERIES } from './discoveryQueries'

// Cache em nÃ­vel de mÃ³dulo (sobrevive a montar/desmontar componentes) â€”
// tanto a grade quanto o modo imersivo usam este hook, entÃ£o reabrir a
// aba Shorts ou trocar entre grade/imersivo nunca reconsulta a API Ã  toa
// dentro da mesma janela de tempo.
let cachedDiscovery: Video[] | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000
const checkedIdsThisSession = new Set<string>()
let sessionSeenIds = new Set<string>() // sobrevive a sair/voltar da tela de Shorts (mesma janela do cache)

export interface ShortsFeed {
  shorts: Video[]
  loaded: boolean
  loadingMore: boolean
  discoveryError: string | null
  catalogIdsRef: React.MutableRefObject<Set<string>>
  loadMore: () => Promise<void>
  retryDiscovery: () => void
  removeFromFeed: (id: string) => void
}

/**
 * Dados do feed de descoberta de Shorts (catÃ¡logo salvo + consultas fixas),
 * compartilhados entre a grade (`ShortsGrid`) e o modo imersivo (`Shorts`)
 * â€” extraÃ­do daqui pra nenhum dos dois duplicar a lÃ³gica de busca/paginaÃ§Ã£o.
 */
export function useShortsFeed(): ShortsFeed {
  const [feedShorts, setFeedShorts] = useState<Video[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)

  const catalogIdsRef = useRef(new Set<string>())
  const seenIdsRef = useRef(sessionSeenIds)
  const pageTokensRef = useRef<Record<string, string | undefined>>({})
  const exhaustedRef = useRef(new Set<string>())
  const queryTurnRef = useRef(0)

  useEffect(() => {
    // `.catch(() => [])`: se o IndexedDB falhar (sem suporte, bloqueado),
    // segue com catÃ¡logo vazio em vez de deixar `loaded` presa em false
    // para sempre (tela de Shorts travada em "Carregandoâ€¦").
    listCatalog()
      .catch(() => [])
      .then(async (all) => {
      const onlyShorts = all.filter((v) => v.isShort)
      onlyShorts.forEach((v) => {
        catalogIdsRef.current.add(v.id)
        seenIdsRef.current.add(v.id)
      })
      setFeedShorts(onlyShorts)
      setLoaded(true)

      if (hasApiKey()) {
        if (cachedDiscovery && Date.now() - cachedAt < CACHE_TTL_MS) {
          mergeDiscovery(cachedDiscovery)
        } else {
          await loadDiscovery()
        }
      }

      // SÃ³ tenta cada vÃ­deo uma vez por sessÃ£o: reabrir a grade/imersivo
      // remonta o hook, e sem essa guarda a mesma checagem em lote seria
      // refeita toda vez â€” combinada com outras buscas do app, isso
      // estourava o limite de requisiÃ§Ãµes por perÃ­odo da API do
      // YouTube (erro 429), mesmo sem estourar a cota diÃ¡ria.
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
        }
      } catch {
        // Checagem em segundo plano Ã© best-effort â€” falha aqui nÃ£o impede o uso.
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function mergeDiscovery(videos: Video[]) {
    const fresh = videos.filter((v) => !seenIdsRef.current.has(v.id))
    fresh.forEach((v) => seenIdsRef.current.add(v.id))
    if (fresh.length > 0) setFeedShorts((current) => [...current, ...fresh])
  }

  // SÃ³ a primeira consulta ao carregar â€” buscar as vÃ¡rias de uma vez
  // (mais a checagem de duraÃ§Ã£o de cada uma) Ã© muita requisiÃ§Ã£o junta,
  // exatamente o tipo de rajada que derruba a API com erro 429. As
  // outras entram aos poucos, conforme o usuÃ¡rio rola (loadMore).
  async function loadDiscovery() {
    setDiscoveryError(null)
    try {
      const q = DISCOVERY_QUERIES[0]
      const page = await searchShortsPage(q)
      pageTokensRef.current[q] = page.nextPageToken
      cachedDiscovery = page.videos
      cachedAt = Date.now()
      mergeDiscovery(page.videos)
    } catch (err) {
      setDiscoveryError(err instanceof YoutubeApiError ? err.message : 'Erro ao buscar vÃ­deos.')
    }
  }

  async function loadMore() {
    if (!hasApiKey() || loadingMore) return
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

  function removeFromFeed(id: string) {
    seenIdsRef.current.delete(id)
    setFeedShorts((current) => current.filter((v) => v.id !== id))
  }

  return {
    shorts: feedShorts,
    loaded,
    loadingMore,
    discoveryError,
    catalogIdsRef,
    loadMore,
    retryDiscovery: loadDiscovery,
    removeFromFeed,
  }
}


