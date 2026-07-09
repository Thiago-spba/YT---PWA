import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CatalogEntry, HistoryEntry, Video } from '../types'

interface YtPwaDB extends DBSchema {
  catalog: { key: string; value: CatalogEntry }
  favorites: { key: string; value: CatalogEntry }
  history: { key: string; value: HistoryEntry }
}

let dbPromise: Promise<IDBPDatabase<YtPwaDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<YtPwaDB>('yt-pwa', 1, {
      upgrade(db) {
        db.createObjectStore('catalog', { keyPath: 'id' })
        db.createObjectStore('favorites', { keyPath: 'id' })
        db.createObjectStore('history', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function addToCatalog(video: Video): Promise<void> {
  const db = await getDB()
  await db.put('catalog', { ...video, addedAt: Date.now() })
}

export async function removeFromCatalog(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('catalog', id)
}

export async function listCatalog(): Promise<CatalogEntry[]> {
  const db = await getDB()
  const all = await db.getAll('catalog')
  return all.sort((a, b) => b.addedAt - a.addedAt)
}

export async function toggleFavorite(video: Video): Promise<boolean> {
  const db = await getDB()
  const existing = await db.get('favorites', video.id)
  if (existing) {
    await db.delete('favorites', video.id)
    return false
  }
  await db.put('favorites', { ...video, addedAt: Date.now() })
  return true
}

export async function isFavorite(id: string): Promise<boolean> {
  const db = await getDB()
  return (await db.get('favorites', id)) !== undefined
}

export async function listFavorites(): Promise<CatalogEntry[]> {
  const db = await getDB()
  const all = await db.getAll('favorites')
  return all.sort((a, b) => b.addedAt - a.addedAt)
}

export async function recordHistory(video: Video): Promise<void> {
  const db = await getDB()
  await db.put('history', { ...video, watchedAt: Date.now() })
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const db = await getDB()
  const all = await db.getAll('history')
  return all.sort((a, b) => b.watchedAt - a.watchedAt)
}
