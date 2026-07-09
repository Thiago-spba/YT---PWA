export interface Video {
  id: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

export interface HistoryEntry extends Video {
  watchedAt: number
}

export interface CatalogEntry extends Video {
  addedAt: number
}
