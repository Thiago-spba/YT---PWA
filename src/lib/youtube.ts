import { resolveThumbnail } from './thumbnail'
import type { Video } from '../types'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export class YoutubeApiError extends Error {}
export class NotEmbeddableError extends YoutubeApiError {}

function assertKey(): string {
  if (!API_KEY) {
    throw new YoutubeApiError(
      'Chave da YouTube Data API não configurada. Defina VITE_YOUTUBE_API_KEY no arquivo .env.',
    )
  }
  return API_KEY
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
  const key = assertKey()
  const params = new URLSearchParams({
    key,
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    safeSearch: 'strict',
  })
  const res = await fetch(`${BASE_URL}/search?${params}`)
  if (!res.ok) {
    throw new YoutubeApiError(`Busca falhou (${res.status})`)
  }
  const data = await res.json()
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

export async function searchVideosPage(query: string, pageToken?: string): Promise<SearchPage> {
  const key = assertKey()
  const params = new URLSearchParams({
    key,
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    safeSearch: 'strict',
  })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await fetch(`${BASE_URL}/search?${params}`)
  if (!res.ok) {
    throw new YoutubeApiError(`Busca falhou (${res.status})`)
  }
  const data = await res.json()
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
  const key = assertKey()
  const params = new URLSearchParams({ key, id, part: 'snippet,contentDetails,status' })
  const res = await fetch(`${BASE_URL}/videos?${params}`)
  if (!res.ok) {
    throw new YoutubeApiError(`Consulta falhou (${res.status})`)
  }
  const data = await res.json()
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
  }
}

/**
 * Busca vídeos e devolve só os que são Shorts de verdade (≤60s) e
 * incorporáveis. Usa `videoDuration=short` (filtro grosso da API, até
 * 4 min) e depois confirma a duração exata via `getVideoFlags`.
 */
export async function searchShorts(query: string): Promise<Video[]> {
  const key = assertKey()
  const params = new URLSearchParams({
    key,
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: '24',
    safeSearch: 'strict',
    videoDuration: 'short',
  })
  const res = await fetch(`${BASE_URL}/search?${params}`)
  if (!res.ok) {
    throw new YoutubeApiError(`Busca falhou (${res.status})`)
  }
  const data = await res.json()
  const candidates: Video[] = data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: resolveThumbnail(item.id.videoId, item.snippet.thumbnails),
  }))
  const flags = await getVideoFlags(candidates.map((v) => v.id))
  return candidates
    .filter((v) => flags[v.id]?.isShort && flags[v.id]?.embeddable)
    .map((v) => ({ ...v, isShort: true }))
}

export interface VideoFlags {
  isShort: boolean
  embeddable: boolean
}

/** Busca duração e permissão de incorporação de até 50 vídeos de uma vez. */
export async function getVideoFlags(ids: string[]): Promise<Record<string, VideoFlags>> {
  if (ids.length === 0) return {}
  const key = assertKey()
  const flags: Record<string, VideoFlags> = {}
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const params = new URLSearchParams({ key, id: batch.join(','), part: 'contentDetails,status' })
    const res = await fetch(`${BASE_URL}/videos?${params}`)
    if (!res.ok) continue
    const data = await res.json()
    for (const item of data.items ?? []) {
      const seconds = parseIsoDuration(item.contentDetails.duration)
      flags[item.id] = {
        isShort: seconds > 0 && seconds <= SHORT_MAX_SECONDS,
        embeddable: item.status?.embeddable !== false,
      }
    }
  }
  return flags
}

export function hasApiKey(): boolean {
  return Boolean(API_KEY)
}
