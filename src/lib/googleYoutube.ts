import { resolveThumbnail } from './thumbnail'
import type { Video } from '../types'

export class GoogleYoutubeError extends Error {
  /** 'unauthenticated' = a conexão com o Google caiu (cookie ausente/expirado) — a UI deve pedir para reconectar em vez de só mostrar um erro genérico. */
  code?: 'unauthenticated'
}

/**
 * Busca um recurso da conta do usuário através do proxy autenticado do
 * servidor (api/youtube-authed.ts) — a function já resolve a paginação
 * inteira e devolve os itens juntados. O navegador não manda nenhum
 * token: o cookie HttpOnly vai junto automaticamente.
 */
async function fetchAuthed(resource: string, params: Record<string, string>): Promise<any[]> {
  const query = new URLSearchParams({ resource, ...params })
  const res = await fetch(`/api/youtube-authed?${query}`)
  if (res.status === 401) {
    const err = new GoogleYoutubeError('Conexão com o Google expirou. Conecte novamente.')
    err.code = 'unauthenticated'
    throw err
  }
  if (!res.ok) {
    throw new GoogleYoutubeError(`Falha ao consultar sua conta do Google (${res.status}).`)
  }
  const data = (await res.json()) as { items?: any[] }
  return data.items ?? []
}

export interface Subscription {
  channelId: string
  title: string
  thumbnailUrl: string
}

export interface UserPlaylist {
  id: string
  title: string
  itemCount: number
}

export async function listMySubscriptions(): Promise<Subscription[]> {
  const items = await fetchAuthed('subscriptions', {
    part: 'snippet',
    mine: 'true',
    maxResults: '50',
    order: 'alphabetical',
  })
  return items.map((item: any) => ({
    channelId: item.snippet.resourceId.channelId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
  }))
}

export async function listMyPlaylists(): Promise<UserPlaylist[]> {
  const items = await fetchAuthed('playlists', {
    part: 'snippet,contentDetails',
    mine: 'true',
    maxResults: '50',
  })
  return items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    itemCount: item.contentDetails.itemCount ?? 0,
  }))
}

export async function listPlaylistVideos(playlistId: string): Promise<Video[]> {
  const items = await fetchAuthed('playlistItems', {
    part: 'snippet',
    playlistId,
    maxResults: '50',
  })
  return items
    .filter((item: any) => item.snippet?.resourceId?.videoId)
    .map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.videoOwnerChannelTitle ?? item.snippet.channelTitle ?? '',
      thumbnailUrl: resolveThumbnail(item.snippet.resourceId.videoId, item.snippet.thumbnails),
    }))
}
