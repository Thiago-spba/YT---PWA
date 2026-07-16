import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { CatalogEntry, HistoryEntry, InterestEntry, PlaylistEntry, Video } from '../types'

interface YtPwaDB extends DBSchema {
  catalog: { key: string; value: CatalogEntry }
  favorites: { key: string; value: CatalogEntry }
  history: { key: string; value: HistoryEntry }
  playlist: { key: string; value: PlaylistEntry }
  interests: { key: string; value: InterestEntry }
}

let dbPromise: Promise<IDBPDatabase<YtPwaDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<YtPwaDB>('yt-pwa', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('catalog', { keyPath: 'id' })
          db.createObjectStore('favorites', { keyPath: 'id' })
          db.createObjectStore('history', { keyPath: 'id' })
        }
        if (oldVersion < 2) {
          db.createObjectStore('playlist', { keyPath: 'id' })
        }
        if (oldVersion < 3) {
          db.createObjectStore('interests', { keyPath: 'category' })
        }
      },
    }).catch((err) => {
      dbPromise = null
      throw err
    })
  }
  return dbPromise
}

// ============================================================
// 📦 CATALOG - FUNÇÕES PRINCIPAIS
// ============================================================

export async function addToCatalog(video: Video): Promise<void> {
  const db = await getDB()
  await db.put('catalog', { ...video, addedAt: Date.now() })
  // 🔥 Invalida caches após adicionar
  invalidateCatalogCaches()
}

export async function removeFromCatalog(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('catalog', id)
  // 🔥 Invalida caches após remover
  invalidateCatalogCaches()
}

/**
 * 🔥 NOVA FUNÇÃO: Limpa TODO o catálogo de uma vez
 */
export async function clearCatalog(): Promise<void> {
  const db = await getDB()
  await db.clear('catalog')
  // 🔥 Invalida caches após limpar
  invalidateCatalogCaches()
}

/**
 * 🔥 NOVA FUNÇÃO: Verifica se o catálogo está vazio
 */
export async function isCatalogEmpty(): Promise<boolean> {
  const db = await getDB()
  const count = await db.count('catalog')
  return count === 0
}

/**
 * 🔥 NOVA FUNÇÃO: Obtém a quantidade de vídeos no catálogo
 */
export async function getCatalogCount(): Promise<number> {
  const db = await getDB()
  return await db.count('catalog')
}

/**
 * 🔥 NOVA FUNÇÃO: Lista o catálogo SEMPRE do banco (ignora caches)
 */
export async function listCatalog(): Promise<CatalogEntry[]> {
  const db = await getDB()
  
  // 🔥 Sempre buscar do banco, nunca usar cache
  const all = await db.getAll('catalog')
  
  // Ordenar por data de adição (mais recente primeiro)
  const sorted = all.sort((a, b) => b.addedAt - a.addedAt)
  // Se estiver vazio, log para debug
  if (sorted.length === 0) {
  }
  
  return sorted
}

/**
 * 🔥 NOVA FUNÇÃO: Força o recarregamento do catálogo (limpa caches)
 */
export async function refreshCatalog(): Promise<CatalogEntry[]> {
  invalidateCatalogCaches()
  return await listCatalog()
}

// ============================================================
// 📦 FAVORITES - COM CACHE CONTROLADO
// ============================================================

let favoriteIdsCache: Set<string> | null = null
let favoriteIdsPromise: Promise<Set<string>> | null = null

/**
 * 🔥 NOVA FUNÇÃO: Invalida o cache de favoritos
 */
export function invalidateFavoritesCache(): void {
  favoriteIdsCache = null
  favoriteIdsPromise = null
}

export async function getFavoriteIds(): Promise<Set<string>> {
  if (favoriteIdsCache) return favoriteIdsCache
  if (!favoriteIdsPromise) {
    favoriteIdsPromise = (async () => {
      const db = await getDB()
      const set = new Set<string>(await db.getAllKeys('favorites'))
      favoriteIdsCache = set
      return set
    })()
  }
  return favoriteIdsPromise
}

export async function toggleFavorite(video: Video): Promise<boolean> {
  const db = await getDB()
  const existing = await db.get('favorites', video.id)
  if (existing) {
    await db.delete('favorites', video.id)
    favoriteIdsCache?.delete(video.id)
    return false
  }
  await db.put('favorites', { ...video, addedAt: Date.now() })
  favoriteIdsCache?.add(video.id)
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

// ============================================================
// 📦 PLAYLIST - COM CACHE CONTROLADO
// ============================================================

let playlistIdsCache: Set<string> | null = null
let playlistIdsPromise: Promise<Set<string>> | null = null

/**
 * 🔥 NOVA FUNÇÃO: Invalida o cache da playlist
 */
export function invalidatePlaylistCache(): void {
  playlistIdsCache = null
  playlistIdsPromise = null
}

export async function getPlaylistIds(): Promise<Set<string>> {
  if (playlistIdsCache) return playlistIdsCache
  if (!playlistIdsPromise) {
    playlistIdsPromise = (async () => {
      const db = await getDB()
      const set = new Set<string>(await db.getAllKeys('playlist'))
      playlistIdsCache = set
      return set
    })()
  }
  return playlistIdsPromise
}

export async function toggleInPlaylist(video: Video): Promise<boolean> {
  const db = await getDB()
  const tx = db.transaction('playlist', 'readwrite')
  const store = tx.store
  const existing = await store.get(video.id)
  if (existing) {
    await store.delete(video.id)
    await tx.done
    playlistIdsCache?.delete(video.id)
    return false
  }
  const all = await store.getAll()
  const maxPosition = all.reduce((max, v) => Math.max(max, v.position), -1)
  await store.put({ ...video, position: maxPosition + 1, addedAt: Date.now() })
  await tx.done
  playlistIdsCache?.add(video.id)
  return true
}

export async function isInPlaylist(id: string): Promise<boolean> {
  const db = await getDB()
  return (await db.get('playlist', id)) !== undefined
}

export async function listPlaylist(): Promise<PlaylistEntry[]> {
  const db = await getDB()
  const all = await db.getAll('playlist')
  return all.sort((a, b) => a.position - b.position)
}

export async function removeFromPlaylist(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('playlist', id)
  playlistIdsCache?.delete(id)
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

// ============================================================
// 📦 HISTORY
// ============================================================

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

// ============================================================
// 📦 INTERESTS
// ============================================================

const INTEREST_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000

function decayedScore(entry: InterestEntry, now: number): number {
  const elapsedMs = now - entry.updatedAt
  if (elapsedMs <= 0) return entry.score
  return entry.score * Math.pow(0.5, elapsedMs / INTEREST_HALF_LIFE_MS)
}

export async function recordInterest(categories: string[], weight = 1): Promise<void> {
  if (categories.length === 0) return
  const db = await getDB()
  const tx = db.transaction('interests', 'readwrite')
  const now = Date.now()
  for (const category of categories) {
    const existing = await tx.store.get(category)
    const currentScore = existing ? decayedScore(existing, now) : 0
    await tx.store.put({ category, score: currentScore + weight, updatedAt: now })
  }
  await tx.done
}

export async function getTopCategories(limit = 5): Promise<string[]> {
  const db = await getDB()
  const all = await db.getAll('interests')
  const now = Date.now()
  return all
    .map((entry) => ({ category: entry.category, score: decayedScore(entry, now) }))
    .filter((entry) => entry.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.category)
}

// ============================================================
// 🔥 FUNÇÕES DE RESET COMPLETO (NOVAS)
// ============================================================

/**
 * 🔥 NOVA FUNÇÃO: Invalida TODOS os caches em memória
 */
export function invalidateCatalogCaches(): void {
  invalidateFavoritesCache()
  invalidatePlaylistCache()
}

/**
 * 🔥 NOVA FUNÇÃO: Reset COMPLETO do catálogo
 * - Limpa todos os vídeos
 * - Invalida todos os caches
 * - Força recarga
 */
export async function resetCatalog(): Promise<void> {
  // 1. Limpar o banco
  await clearCatalog()
  
  // 2. Invalidar caches
  invalidateCatalogCaches()
  
  // 3. Verificar se limpou
  console.debug('Catalog count after reset:', await getCatalogCount())
}

/**
 * 🔥 NOVA FUNÇÃO: Reset COMPLETO do app (todas as stores)
 * USO: Quando o usuário quer limpar todos os dados
 */
export async function resetAllData(): Promise<void> {
  const db = await getDB()
  
  // Limpar todas as stores
  await db.clear('catalog')
  await db.clear('favorites')
  await db.clear('history')
  await db.clear('playlist')
  await db.clear('interests')
  
  // Invalidar todos os caches
  invalidateCatalogCaches()
}

/**
 * 🔥 NOVA FUNÇÃO: Verifica integridade do banco
 */
export async function checkDatabaseHealth(): Promise<{
  catalog: number
  favorites: number
  history: number
  playlist: number
  interests: number
  dbExists: boolean
}> {
  try {
    const db = await getDB()
    const [catalog, favorites, history, playlist, interests] = await Promise.all([
      db.count('catalog'),
      db.count('favorites'),
      db.count('history'),
      db.count('playlist'),
      db.count('interests'),
    ])
    
    return {
      catalog,
      favorites,
      history,
      playlist,
      interests,
      dbExists: true,
    }
  } catch (error) {
    console.error('❌ Erro ao verificar saúde do banco:', error)
    return {
      catalog: 0,
      favorites: 0,
      history: 0,
      playlist: 0,
      interests: 0,
      dbExists: false,
    }
  }
}

/**
 * 🔥 NOVA FUNÇÃO: Atualiza vídeos do catálogo em lote
 * Útil para sincronizar com a API
 */
export async function syncCatalog(videos: Video[]): Promise<void> {
  // Limpar catálogo existente
  await clearCatalog()
  
  // Adicionar novos vídeos
  const db = await getDB()
  const tx = db.transaction('catalog', 'readwrite')
  for (const video of videos) {
    await tx.store.put({ ...video, addedAt: Date.now() })
  }
  await tx.done
  
  // Invalidar caches
  invalidateCatalogCaches()
}

// ============================================================
// 🔧 FUNÇÕES DE DEBUG (NOVAS)
// ============================================================

/**
 * 🔥 NOVA FUNÇÃO: Debug - mostra o estado atual do catálogo
 */
export async function debugCatalog(): Promise<void> {
  const videos = await listCatalog()
  if (videos.length > 0) {
    console.debug('Catalog sample:', videos.slice(0, 5))
  }
  
  const health = await checkDatabaseHealth()
  console.debug('Database health:', health)
}

// ============================================================
// ⚠️ FUNÇÕES DE MIGRAÇÃO (NOVAS)
// ============================================================

/**
 * 🔥 NOVA FUNÇÃO: Atualiza flags de vídeos do catálogo
 * (mantida da versão anterior)
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
  // Invalida caches após atualizar
  invalidateCatalogCaches()
}