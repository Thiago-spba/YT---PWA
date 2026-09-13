// Autocomplete inteligente da busca (item 6). Três fontes, nessa ordem de prioridade:
//
// 1. Buscas anteriores: termos que você mesmo já digitou e buscou antes
//    (store `searchHistory` do IndexedDB, independente de ter assistido
//    algo ou não). Nunca chama a rede.
// 2. Vídeos assistidos: reaproveita a coleção de histórico do item 3
//    (vídeos assistidos, store `history` do IndexedDB) — sugere títulos e
//    canais já vistos que contêm o termo digitado. Nunca chama a rede.
// 3. IA, complementar: só quando as duas fontes locais juntas devolvem menos
//    de 3 sugestões, complementa com termos relacionados vindos da Vercel
//    Function do item 4 (`expandSearchTerm`), que roda no servidor e nunca
//    expõe a chave da Anthropic no navegador.
//
// Cache por prefixo em memória da sessão para a parte de IA (a única com
// custo de rede) — o `expandSearchTerm` já mantém cache em localStorage por
// 24h; este mapa evita até o parse do localStorage para um prefixo repetido
// na mesma sessão. As sugestões locais são sempre recalculadas (são baratas
// e assim refletem buscas/vídeos recentes sem cache velho).

import type { HistoryEntry } from '../types'
import { expandSearchTerm } from './aiSearch'

const MIN_TERM_LENGTH = 3
const MIN_LOCAL_BEFORE_AI = 3
const MAX_SUGGESTIONS = 6

const aiCache = new Map<string, string[]>()

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Fonte 1 (custo zero): termos que você já buscou antes (busca digitada,
 * independente de ter assistido algo daquela busca) que contêm o texto
 * digitado agora. Do mais recente pro mais antigo (ordem em que `searchHistory` chega).
 */
export function pastSearchSuggestions(term: string, searchHistory: string[]): string[] {
  const q = normalize(term)
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const past of searchHistory) {
    const clean = past.trim()
    if (!clean) continue
    const key = clean.toLowerCase()
    if (key === q || seen.has(key)) continue
    if (key.includes(q)) {
      seen.add(key)
      out.push(clean)
      if (out.length >= MAX_SUGGESTIONS) return out
    }
  }
  return out
}

/**
 * Fonte 2 (custo zero): termos do histórico de vídeos assistidos que contêm
 * o texto digitado. Considera título e canal, deduplicando por texto.
 */
export function localSuggestions(term: string, history: HistoryEntry[]): string[] {
  const q = normalize(term)
  if (!q) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of history) {
    for (const source of [entry.title, entry.channelTitle]) {
      const clean = source?.trim()
      if (!clean) continue
      const key = clean.toLowerCase()
      if (key.includes(q) && !seen.has(key)) {
        seen.add(key)
        out.push(clean)
        if (out.length >= MAX_SUGGESTIONS) return out
      }
    }
  }
  return out
}

// Fonte 3 (IA): termos relacionados via Vercel Function, com cache por
// prefixo em memória. `expandSearchTerm` já não lança erro (retorna [] se a
// function falhar), mas envolvemos em try/catch por garantia — qualquer nova
// chamada de rede deste item deve degradar de forma silenciosa e amigável.
async function aiSuggestions(q: string): Promise<string[]> {
  const cached = aiCache.get(q)
  if (cached) return cached
  try {
    const terms = await expandSearchTerm(q)
    aiCache.set(q, terms)
    return terms
  } catch {
    return []
  }
}

/**
 * Sugestões combinadas para o autocomplete: começa pelas buscas anteriores
 * (Fonte 1), depois vídeos assistidos (Fonte 2); só recorre à IA (Fonte 3)
 * quando as duas juntas somam menos de 3 e a busca por API está disponível.
 * Devolve no máximo 6 termos, sem duplicatas.
 */
export async function getSuggestions(
  term: string,
  history: HistoryEntry[],
  useAi: boolean,
  searchHistory: string[] = [],
): Promise<string[]> {
  const q = normalize(term)
  if (q.length < MIN_TERM_LENGTH) return []

  const combined: string[] = []
  const seen = new Set<string>()
  function addAll(list: string[]) {
    for (const t of list) {
      const clean = t.trim()
      const key = clean.toLowerCase()
      if (clean && !seen.has(key)) {
        seen.add(key)
        combined.push(clean)
      }
    }
  }

  addAll(pastSearchSuggestions(q, searchHistory))
  addAll(localSuggestions(q, history))

  if (useAi && combined.length < MIN_LOCAL_BEFORE_AI) {
    addAll(await aiSuggestions(q))
  }

  return combined.slice(0, MAX_SUGGESTIONS)
}
