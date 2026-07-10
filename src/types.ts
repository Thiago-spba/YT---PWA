export interface Video {
  id: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  isShort?: boolean
}

export interface HistoryEntry extends Video {
  watchedAt: number
}

export interface CatalogEntry extends Video {
  addedAt: number
}

export interface PlaylistEntry extends Video {
  position: number
  addedAt: number
}
