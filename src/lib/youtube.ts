import type { Video } from '../types'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export class YoutubeApiError extends Error {}

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
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
  }))
}

export async function getVideoById(id: string): Promise<Video | null> {
  const key = assertKey()
  const params = new URLSearchParams({ key, id, part: 'snippet' })
  const res = await fetch(`${BASE_URL}/videos?${params}`)
  if (!res.ok) {
    throw new YoutubeApiError(`Consulta falhou (${res.status})`)
  }
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null
  return {
    id: item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url,
  }
}

export function hasApiKey(): boolean {
  return Boolean(API_KEY)
}
