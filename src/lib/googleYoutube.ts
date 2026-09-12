import { getAccessToken, GoogleAuthError } from './googleAuth'
import { resolveThumbnail } from './thumbnail'
import type { Video } from '../types'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'
// Limite de segurança para não entrar num loop enorme em contas com
// milhares de itens — 20 páginas de 50 já cobre 1000 itens, bem acima
// do que uma conta pessoal costuma ter.
const MAX_PAGES = 20

export class GoogleYoutubeError extends Error {}

async function authedGet(path: string, params: Record<string, string>) {
  const token = getAccessToken()
  if (!token) throw new GoogleAuthError('Não conectado ao Google.')
  const query = new URLSearchParams(params)
  const res = await fetch(`${BASE_URL}/${path}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new GoogleYoutubeError(`Falha ao consultar sua conta do Google (${res.status}).`)
  }
  return res.json()
}

/**
 * Busca TODAS as páginas de um endpoint paginado da API do YouTube — a
 * API só devolve até 50 itens por chamada. Sem isso, contas com mais de
 * 50 inscrições, mais de 50 playlists, ou uma playlist com mais de 50
 * vídeos ficavam com o restante faltando ao importar, sem nenhum aviso
 * (era a causa provável do "importar tudo" vir incompleto).
 */
async function authedGetAllPages(path: string, params: Record<string, string>): Promise<any[]> {
  const items: any[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await authedGet(path, pageToken ? { ...params, pageToken } : params)
    items.push(...(data.items ?? []))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return items
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
  const items = await authedGetAllPages('subscriptions', {
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
  const items = await authedGetAllPages('playlists', {
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
  const items = await authedGetAllPages('playlistItems', {
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
