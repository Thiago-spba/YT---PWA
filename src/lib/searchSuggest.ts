// Autocomplete inteligente da busca (item 6). Duas fontes:
//
// 1. Local, sem custo: reaproveita a coleção de histórico do item 3
//    (vídeos assistidos, store `history` do IndexedDB) — sugere títulos e
//    canais já vistos que contêm o termo digitado. Nunca chama a rede.
// 2. IA, complementar: só quando o histórico local devolve menos de 3
//    sugestões, complementa com termos relacionados vindos da Vercel
//    Function do item 4 (`expandSearchTerm`), que roda no servidor e nunca
//    expõe a chave da Anthropic no navegador.
//
// Cache por prefixo em memória da sessão para a parte de IA (a única com
// custo de rede) — o `expandSearchTerm` já mantém cache em localStorage por
// 24h; este mapa evita até o parse do localStorage para um prefixo repetido
// na mesma sessão. As sugestões locais são sempre recalculadas (são baratas
// e assim refletem vídeos assistidos recentemente sem cache velho).

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
 * Fonte 1 (custo zero): termos do histórico de vídeos assistidos que contêm
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

// Fonte 2 (IA): termos relacionados via Vercel Function, com cache por
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
 * Sugestões combinadas para o autocomplete. Sempre começa pelas locais
 * (Fonte 1); só recorre à IA (Fonte 2) quando as locais são menos de 3 e a
 * busca por API está disponível. Devolve no máximo 6 termos, sem duplicatas.
 */
export async function getSuggestions(
  term: string,
  history: HistoryEntry[],
  useAi: boolean,
): Promise<string[]> {
  const q = normalize(term)
  if (q.length < MIN_TERM_LENGTH) return []

  const combined = localSuggestions(q, history)

  if (useAi && combined.length < MIN_LOCAL_BEFORE_AI) {
    const ai = await aiSuggestions(q)
    for (const t of ai) {
      const clean = t.trim()
      if (clean && !combined.some((c) => c.toLowerCase() === clean.toLowerCase())) {
        combined.push(clean)
      }
    }
  }

  return combined.slice(0, MAX_SUGGESTIONS)
}
