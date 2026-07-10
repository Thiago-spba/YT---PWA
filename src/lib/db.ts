import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CatalogEntry, HistoryEntry, PlaylistEntry, Video } from '../types'

interface YtPwaDB extends DBSchema {
  catalog: { key: string; value: CatalogEntry }
  favorites: { key: string; value: CatalogEntry }
  history: { key: string; value: HistoryEntry }
  playlist: { key: string; value: PlaylistEntry }
}

let dbPromise: Promise<IDBPDatabase<YtPwaDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<YtPwaDB>('yt-pwa', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('catalog', { keyPath: 'id' })
          db.createObjectStore('favorites', { keyPath: 'id' })
          db.createObjectStore('history', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          db.createObjectStore('playlist', { keyPath: 'id' })
        }
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

/**
 * Atualiza isShort/durationSeconds de itens já salvos, sem mexer em
 * addedAt (preserva a posição no catálogo) — usado para "preencher"
 * vídeos antigos que foram adicionados antes da checagem de duração
 * existir, ou sem a chave de API configurada na hora.
 */
export async function updateCatalogVideoFlags(
  updates: { id: string; isShort?: boolean; durationSeconds?: number }[],
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('catalog', 'readwrite')
  for (const u of updates) {
    const existing = await tx.store.get(u.id)
    if (existing) {
      await tx.store.put({ ...existing, isShort: u.isShort, durationSeconds: u.durationSeconds })
    }
  }
  await tx.done
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

export async function removeHistoryEntry(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('history', id)
}

export async function clearHistory(): Promise<void> {
  const db = await getDB()
  await db.clear('history')
}

export async function listPlaylist(): Promise<PlaylistEntry[]> {
  const db = await getDB()
  const all = await db.getAll('playlist')
  return all.sort((a, b) => a.position - b.position)
}

export async function isInPlaylist(id: string): Promise<boolean> {
  const db = await getDB()
  return (await db.get('playlist', id)) !== undefined
}

export async function toggleInPlaylist(video: Video): Promise<boolean> {
  const db = await getDB()
  // Leitura (posição máxima atual) e escrita na MESMA transação — se
  // duas chamadas acontecem quase juntas (dois cliques em "+" rápidos),
  // o IndexedDB serializa as transações na mesma object store, evitando
  // que ambas leiam a lista vazia/desatualizada e calculem a mesma
  // posição (bug real encontrado no teste: os dois itens ficavam com
  // position: 0).
  const tx = db.transaction('playlist', 'readwrite')
  const store = tx.store
  const existing = await store.get(video.id)
  if (existing) {
    await store.delete(video.id)
    await tx.done
    return false
  }
  const all = await store.getAll()
  const maxPosition = all.reduce((max, v) => Math.max(max, v.position), -1)
  await store.put({ ...video, position: maxPosition + 1, addedAt: Date.now() })
  await tx.done
  return true
}

export async function removeFromPlaylist(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('playlist', id)
}

export async function movePlaylistItem(id: string, direction: 'up' | 'down'): Promise<void> {
  const db = await getDB()
  const all = (await db.getAll('playlist')).sort((a, b) => a.position - b.position)
  const index = all.findIndex((v) => v.id === id)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapWith < 0 || swapWith >= all.length) return
  const tx = db.transaction('playlist', 'readwrite')
  const a = all[index]
  const b = all[swapWith]
  await tx.store.put({ ...a, position: b.position })
  await tx.store.put({ ...b, position: a.position })
  await tx.done
}
