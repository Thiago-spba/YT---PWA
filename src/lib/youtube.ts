import { resolveThumbnail } from './thumbnail'
import type { Video } from '../types'
import { isQuotaExceeded, markQuotaExceeded, readYoutubeCache, writeYoutubeCache, QUOTA_EXCEEDED_MESSAGE } from './youtubeCache'

export class YoutubeApiError extends Error {}
export class NotEmbeddableError extends YoutubeApiError {}
export class QuotaExceededError extends YoutubeApiError {}

/**
 * 429 = rate limit temporÃ¡rio (resolve em minutos) â€” NÃƒO marca cota esgotada.
 * 403 = cota diÃ¡ria esgotada (sÃ³ volta amanhÃ£) â€” marca cota esgotada.
 */
function apiErrorMessage(action: 'Busca' | 'Consulta', status: number): string {
  if (status === 429) return `${action} falhou: muitas buscas em pouco tempo. Aguarde alguns minutos e tente de novo.`
  if (status === 403) return `${action} falhou: cota diÃ¡ria da busca esgotada. Volta a funcionar amanhÃ£.`
  return `${action} falhou (${status})`
}

/**
 * Ãšnico ponto de acesso Ã  Vercel Function /api/youtube.
 * - Tenta cache local (24h) antes de ir Ã  rede.
 * - Se cota jÃ¡ foi marcada como esgotada NESTA SESSÃƒO (403 real), nem tenta a rede.
 * - 429 NÃƒO marca cota esgotada; apenas lanÃ§a erro para o caller decidir retry/backoff.
 * - 403 marca cota esgotada para o resto da sessÃ£o (aba atual).
 */
async function fetchYoutube(endpoint: 'search' | 'videos', params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams({ endpoint, ...params })
  const cacheKey = query.toString()

  const cached = readYoutubeCache<unknown>(cacheKey)
  if (cached) return cached

  if (isQuotaExceeded()) {
    throw new QuotaExceededError(QUOTA_EXCEEDED_MESSAGE)
  }

  const res = await fetch(`/api/youtube?${query}`)
  
  // 429 = rate limit temporÃ¡rio: NÃƒO marca quotaExceeded, apenas propaga erro
  if (res.status === 429) {
    throw new YoutubeApiError(apiErrorMessage(endpoint === 'search' ? 'Busca' : 'Consulta', 429))
  }
  
  // 403 = cota diÃ¡ria esgotada: marca quotaExceeded para evitar rajadas nesta aba
  if (res.status === 403) {
    markQuotaExceeded()
    throw new YoutubeApiError(apiErrorMessage(endpoint === 'search' ? 'Busca' : 'Consulta', 403))
  }
  
  if (!res.ok) {
    throw new YoutubeApiError(apiErrorMessage(endpoint === 'search' ? 'Busca' : 'Consulta', res.status))
  }
  
  const data = await res.json()
  writeYoutubeCache(cacheKey, data)
  return data
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1) || null
    }
    if (url.hostname.includes('youtube')) {
      const v = url.searchParams.get('v')
      if (v) return v
      const embedMatch = url.pathname.match(/\/embed\/([\w-]{11})/)
      if (embedMatch) return embedMatch[1]
    }
  } catch {
    return null
  }
  return null
}

export async function searchVideos(query: string): Promise<Video[]> {
  const data = await fetchYoutube('search', {
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    safeSearch: 'strict',
    relevanceLanguage: 'pt',
    regionCode: 'BR',
  })
  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: resolveThumbnail(item.id.videoId, item.snippet.thumbnails),
  }))
}

export interface SearchPage {
  videos: Video[]
  nextPageToken?: string
}

export async function searchVideosPage(query: string, pageToken?: string, order?: 'date'): Promise<SearchPage> {
  const params: Record<string, string> = {
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    safeSearch: 'strict',
    relevanceLanguage: 'pt',
    regionCode: 'BR',
  }
  if (pageToken) params.pageToken = pageToken
  if (order) params.order = order
  const data = await fetchYoutube('search', params)
  return {
    videos: data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: resolveThumbnail(item.id.videoId, item.snippet.thumbnails),
    })),
    nextPageToken: data.nextPageToken,
  }
}

/** Converte duraÃ§Ã£o ISO 8601 (ex: "PT1M5S") em segundos. */
export function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const [, h, m, s] = match
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)
}

const SHORT_MAX_SECONDS = 60

export async function getVideoById(id: string): Promise<Video | null> {
  const data = await fetchYoutube('videos', { id, part: 'snippet,contentDetails,status' })
  const item = data.items?.[0]
  if (!item) return null
  if (item.status?.embeddable === false) {
    throw new NotEmbeddableError(
      'Este vÃ­deo nÃ£o pode ser adicionado: o dono desativou a reproduÃ§Ã£o fora do YouTube.',
    )
  }
  const seconds = item.contentDetails?.duration ? parseIsoDuration(item.contentDetails.duration) : null
  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: resolveThumbnail(item.id, item.snippet.thumbnails),
    isShort: seconds !== null ? seconds > 0 && seconds <= SHORT_MAX_SECONDS : undefined,
    durationSeconds: seconds ?? undefined,
  }
}

/**
 * Busca metadados completos de atÃ© 50 vÃ­deos por chamada via endpoint
 * `videos` (custo 1 de cota, contra 100 do `search`) â€” usado para montar a
 * primeira pÃ¡gina da Home a partir de uma lista curada de IDs
 * (`src/config/recommendedVideos.ts`) sem gastar cota de busca. VÃ­deos nÃ£o
 * encontrados ou com reproduÃ§Ã£o bloqueada fora do YouTube sÃ£o omitidos em
 * silÃªncio (a lista pode ficar mais curta, mas nunca quebra).
 */
export async function getVideosByIds(ids: string[]): Promise<Video[]> {
  if (ids.length === 0) return []
  const videos: Video[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    try {
      const data = await fetchYoutube('videos', { id: batch.join(','), part: 'snippet,contentDetails,status' })
      for (const item of data.items ?? []) {
        if (item.status?.embeddable === false) continue
        const seconds = item.contentDetails?.duration ? parseIsoDuration(item.contentDetails.duration) : null
        videos.push({
          id: item.id,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl: resolveThumbnail(item.id, item.snippet.thumbnails),
          isShort: seconds !== null ? seconds > 0 && seconds <= SHORT_MAX_SECONDS : undefined,
          durationSeconds: seconds ?? undefined,
        })
      }
    } catch {
      continue
    }
  }
  return videos
}

/**
 * Busca vÃ­deos e devolve sÃ³ os que sÃ£o Shorts de verdade (â‰¤60s) e
 * incorporÃ¡veis. Usa `videoDuration=short` (filtro grosso da API, atÃ©
 * 4 min) e depois confirma a duraÃ§Ã£o exata via `getVideoFlags`. Aceita
 * `pageToken` para rolagem infinita (mesmo padrÃ£o de `searchVideosPage`).
 */
export async function searchShortsPage(query: string, pageToken?: string): Promise<SearchPage> {
  const params: Record<string, string> = {
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '24',
    safeSearch: 'strict',
    videoDuration: 'short',
    regionCode: 'BR',
    relevanceLanguage: 'pt',
  }
  if (pageToken) params.pageToken = pageToken
  const data = await fetchYoutube('search', params)
  const candidates: Video[] = data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: resolveThumbnail(item.id.videoId, item.snippet.thumbnails),
  }))
  const flags = await getVideoFlags(candidates.map((v) => v.id))
  const videos = candidates
    .filter((v) => flags[v.id]?.isShort && flags[v.id]?.embeddable)
    .map((v) => ({ ...v, isShort: true, durationSeconds: flags[v.id]?.durationSeconds }))
  return { videos, nextPageToken: data.nextPageToken }
}

export async function searchShorts(query: string): Promise<Video[]> {
  return (await searchShortsPage(query)).videos
}

export interface VideoFlags {
  isShort: boolean
  embeddable: boolean
  durationSeconds: number
}

/** Busca duraÃ§Ã£o e permissÃ£o de incorporaÃ§Ã£o de atÃ© 50 vÃ­deos de uma vez. */
export async function getVideoFlags(ids: string[]): Promise<Record<string, VideoFlags>> {
  if (ids.length === 0) return {}
  const flags: Record<string, VideoFlags> = {}
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    try {
      const data = await fetchYoutube('videos', { id: batch.join(','), part: 'contentDetails,status' })
      for (const item of data.items ?? []) {
        const seconds = parseIsoDuration(item.contentDetails.duration)
        flags[item.id] = {
          isShort: seconds > 0 && seconds <= SHORT_MAX_SECONDS,
          embeddable: item.status?.embeddable !== false,
          durationSeconds: seconds,
        }
      }
    } catch {
      continue
    }
  }
  return flags
}

/**
 * A chave da YouTube Data API agora vive sÃ³ no servidor (api/youtube.ts),
 * nunca no cliente â€” entÃ£o nÃ£o hÃ¡ mais "chave ausente" do ponto de vista
 * do navegador. Mantida para nÃ£o obrigar os componentes que jÃ¡ checam
 * `hasApiKey()` a mudar de forma.
 */
export function hasApiKey(): boolean {
  return true
}

