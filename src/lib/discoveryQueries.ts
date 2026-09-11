/**
 * Consultas usadas para popular os feeds de descoberta (Início e Shorts)
 * sem depender de vídeos importados.
 *
 * Duas camadas:
 * 1. `DISCOVERY_QUERIES` — consultas genéricas fixas, usadas só como
 *    fallback para quem ainda não tem histórico (usuário novo) ou quando
 *    nenhuma categoria de interesse tem consulta mapeada.
 * 2. `CATEGORY_QUERIES` + `buildPersonalizedQueries` — mapeiam as
 *    categorias de maior interesse do usuário (calculadas em `db.ts` a
 *    partir do que ele busca/assiste, classificadas por `categories.ts`)
 *    para consultas de busca reais. Isso é o que faz Início e Shorts
 *    mostrarem vídeos parecidos com o que a pessoa realmente assiste, em
 *    vez de sempre o mesmo punhado de assuntos genéricos.
 *
 * Cada entrada vira uma query `search?type=video` no YouTube Data API v3
 * (via /api/youtube). Mantenha ≤ 6–7 queries para não estourar cota/
 * rate-limit no rodízio de `loadMore`.
 */
export const DISCOVERY_QUERIES = [
  'notícias Brasil hoje',              // Atualidades nacionais
  'notícias mundo resumo',             // Atualidades globais
  'tecnologia novidades recentes',     // Tecnologia
  'educação dicas estudo',             // Educação
  'curiosidades ciência fatos',        // Curiosidades (ciência/geral)
]

/**
 * Uma consulta de busca por categoria (mesmas chaves de `CATEGORY_KEYWORDS`
 * em `categories.ts`). Sem entrada aqui = categoria só serve para
 * priorizar vídeos já carregados (ver Home.tsx), não para buscar novos.
 */
export const CATEGORY_QUERIES: Record<string, string> = {
  religioso: 'louvor gospel música cristã',
  misterio_ovni: 'mistérios e curiosidades inexplicáveis',
  musica: 'música clipe show ao vivo',
  noticias: 'notícias Brasil hoje',
  entretenimento: 'vídeos de comédia e humor',
  educativo: 'aula tutorial como fazer',
  infantil: 'desenho animado infantil',
  esportes: 'melhores momentos futebol',
}

/**
 * Monta as consultas de descoberta a partir das categorias de maior
 * interesse do usuário (na ordem recebida, já vem ordenado por
 * `getTopCategories`). Cai para `DISCOVERY_QUERIES` quando ainda não há
 * categorias (histórico vazio) ou nenhuma delas tem consulta mapeada —
 * assim o feed nunca fica vazio, só menos personalizado no começo.
 */
export function buildPersonalizedQueries(topCategories: string[]): string[] {
  const mapped = topCategories
    .map((category) => CATEGORY_QUERIES[category])
    .filter((q): q is string => Boolean(q))
  return mapped.length > 0 ? mapped : DISCOVERY_QUERIES
}
