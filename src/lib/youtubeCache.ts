// Cache de resultados de busca (localStorage, 24h) + circuit breaker de
// cota (sessionStorage) para a API do YouTube. A API cobra 100 pontos de
// cota por busca — sem isso, buscas repetidas (autocomplete, feed de
// descoberta, "A seguir") esgotavam o limite rápido e causavam 429/403 em
// cascata por toda a sessão.

const CACHE_PREFIX = 'yt-pwa:youtube-cache:v1:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const QUOTA_FLAG_KEY = 'yt-pwa:youtube-quota-exceeded'

export const QUOTA_EXCEEDED_MESSAGE =
  'Limite diário de buscas atingido. Aproveite os vídeos recomendados na página inicial!'

interface CacheEntry {
  data: unknown
  cachedAt: number
}

export function readYoutubeCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data as T
  } catch {
    return null
  }
}

export function writeYoutubeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, cachedAt: Date.now() } satisfies CacheEntry))
  } catch {
    // Armazenamento cheio ou bloqueado (modo privado) — cache é
    // best-effort, o app segue funcionando sem ele.
  }
}

/** true assim que o proxy responder 429/403 uma vez nesta sessão de aba. */
export function isQuotaExceeded(): boolean {
  try {
    try {
    const raw = localStorage.getItem(QUOTA_FLAG_KEY)
    if (!raw) return false
    const { exceededAt } = JSON.parse(raw)
    // Reseta automaticamente apos 24h (quando a cota do Google renova)
    if (Date.now() - exceededAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(QUOTA_FLAG_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
  } catch {
    return false
  }
}

export function markQuotaExceeded(): void {
  try {
    localStorage.setItem(QUOTA_FLAG_KEY, JSON.stringify({ exceededAt: Date.now() }))
  } catch {
    // ignore
  }
}
