export interface Video {
  id: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  isShort?: boolean
  durationSeconds?: number
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

export interface InterestEntry {
  category: string
  score: number
  updatedAt: number
}

/** Progresso de vídeo salvo no Firestore (users/{userId}/videoProgress/{videoId}) */
export interface VideoProgress {
  videoId: string
  userId: string
  currentTime: number
  duration: number
  updatedAt: number
  completed: boolean
}

/** Documento bruto vindo do Firestore (com Timestamp) */
export interface VideoProgressDoc extends Omit<VideoProgress, 'updatedAt'> {
  updatedAt: Date | { toDate: () => Date } | number
}

export interface Collection {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface CollectionEntry extends Video {
  collectionId: string
  addedAt: number
}
