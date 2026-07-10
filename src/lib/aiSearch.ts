// Busca inteligente por assunto (item 4): expande o termo digitado em
// sinônimos/categorias usando a Claude API (Haiku), chamada sempre do
// lado do servidor (Vercel Function em /api/search-expand) — a chave da
// Anthropic nunca roda no navegador. Cache local em localStorage evita
// chamar a API de novo para a mesma busca repetida.

const CACHE_PREFIX = 'yt-pwa:ai-search-cache:v1:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  terms: string[]
  cachedAt: number
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function readCache(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null
    return entry.terms
  } catch {
    return null
  }
}

function writeCache(key: string, terms: string[]): void {
  try {
    const entry: CacheEntry = { terms, cachedAt: Date.now() }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage indisponível/cheio — cache é só uma otimização, segue sem ele.
  }
}

/**
 * Retorna até 5 termos relacionados ao texto buscado (sinônimos/categorias),
 * usando cache local por termo. Nunca lança erro — se a function falhar ou
 * estiver indisponível, retorna lista vazia (a busca original continua
 * funcionando normalmente).
 */
export async function expandSearchTerm(query: string): Promise<string[]> {
  const key = normalizeQuery(query)
  if (!key) return []

  const cached = readCache(key)
  if (cached) return cached

  try {
    const response = await fetch('/api/search-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: key }),
    })
    if (!response.ok) return []
    const data = (await response.json()) as { terms?: unknown }
    const terms = Array.isArray(data.terms) ? data.terms.filter((t): t is string => typeof t === 'string') : []
    writeCache(key, terms)
    return terms
  } catch {
    return []
  }
}
