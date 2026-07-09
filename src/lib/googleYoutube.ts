import { getAccessToken, GoogleAuthError } from './googleAuth'
import type { Video } from '../types'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'

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
  const data = await authedGet('subscriptions', {
    part: 'snippet',
    mine: 'true',
    maxResults: '50',
    order: 'alphabetical',
  })
  return (data.items ?? []).map((item: any) => ({
    channelId: item.snippet.resourceId.channelId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? '',
  }))
}

export async function listMyPlaylists(): Promise<UserPlaylist[]> {
  const data = await authedGet('playlists', {
    part: 'snippet,contentDetails',
    mine: 'true',
    maxResults: '50',
  })
  return (data.items ?? []).map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    itemCount: item.contentDetails.itemCount ?? 0,
  }))
}

export async function listPlaylistVideos(playlistId: string): Promise<Video[]> {
  const data = await authedGet('playlistItems', {
    part: 'snippet',
    playlistId,
    maxResults: '50',
  })
  return (data.items ?? [])
    .filter((item: any) => item.snippet?.resourceId?.videoId)
    .map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.videoOwnerChannelTitle ?? item.snippet.channelTitle ?? '',
      thumbnailUrl:
        item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
    }))
}
