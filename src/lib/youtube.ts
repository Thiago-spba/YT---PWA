import { resolveThumbnail } from './thumbnail'
import type { Video } from '../types'
import { isQuotaExceeded, markQuotaExceeded, readYoutubeCache, writeYoutubeCache, QUOTA_EXCEEDED_MESSAGE } from './youtubeCache'

export class YoutubeApiError extends Error {}
export class NotEmbeddableError extends YoutubeApiError {}
export class QuotaExceededError extends YoutubeApiError {}

/**
 * 429 e 403 são erros de limite do Google, não bugs do app — mas com
 * mensagem genérica ("Busca falhou (429)") pareciam a mesma coisa.
 * 429 = limite de requisições em um curto período (passa em minutos).
 * 403 = cota diária gratuita esgotada (só volta a funcionar amanhã).
 */
function apiErrorMessage(action: 'Busca' | 'Consulta', status: number): string {
  if (status === 429) return `${action} falhou: muitas buscas em pouco tempo. Aguarde alguns minutos e tente de novo.`
  if (status === 403) return `${action} falhou: cota diária da busca esgotada. Volta a funcionar amanhã.`
  return `${action} falhou (${status})`
}

/**
 * Único ponto de acesso à Vercel Function /api/youtube (a chave real vive
 * só lá, no servidor). Antes de qualquer requisição de rede: 1) tenta o
 * cache local (24h) — resultado idêntico não gasta cota de novo; 2) se a
 * cota já foi dada como esgotada nesta sessão, nem tenta a rede. Ao
 * receber 429/403 do proxy, marca a cota como esgotada para o resto da
 * sessão (aba atual), evitando uma rajada de chamadas automáticas contra
 * um limite que já sabemos estar bloqueado.
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
  if (res.status === 429 || res.status === 403) {
    markQuotaExceeded()
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

/** Converte duração ISO 8601 (ex: "PT1M5S") em segundos. */
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
      'Este vídeo não pode ser adicionado: o dono desativou a reprodução fora do YouTube.',
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
 * Busca metadados completos de até 50 vídeos por chamada via endpoint
 * `videos` (custo 1 de cota, contra 100 do `search`) — usado para montar a
 * primeira página da Home a partir de uma lista curada de IDs
 * (`src/config/recommendedVideos.ts`) sem gastar cota de busca. Vídeos não
 * encontrados ou com reprodução bloqueada fora do YouTube são omitidos em
 * silêncio (a lista pode ficar mais curta, mas nunca quebra).
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
 * Busca vídeos e devolve só os que são Shorts de verdade (≤60s) e
 * incorporáveis. Usa `videoDuration=short` (filtro grosso da API, até
 * 4 min) e depois confirma a duração exata via `getVideoFlags`. Aceita
 * `pageToken` para rolagem infinita (mesmo padrão de `searchVideosPage`).
 */
export async function searchShortsPage(query: string, pageToken?: string): Promise<SearchPage> {
  const params: Record<string, string> = {
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '24',
    safeSearch: 'strict',
    videoDuration: 'short',
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

/** Busca duração e permissão de incorporação de até 50 vídeos de uma vez. */
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
 * A chave da YouTube Data API agora vive só no servidor (api/youtube.ts),
 * nunca no cliente — então não há mais "chave ausente" do ponto de vista
 * do navegador. Mantida para não obrigar os componentes que já checam
 * `hasApiKey()` a mudar de forma.
 */
export function hasApiKey(): boolean {
  return true
}
