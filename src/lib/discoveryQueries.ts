/**
 * Consultas fixas usadas para popular os feeds de descoberta (InÃ­cio e
 * Shorts) sem depender de vÃ­deos importados â€” ficam sÃ³ aqui, num lugar
 * Ãºnico, pra InÃ­cio e Shorts nunca saÃ­rem de sincronia sobre o que
 * "o feed padrÃ£o" mostra.
 *
 * Nicho: Atualidades, Tecnologia, EducaÃ§Ã£o, Engenharia e Curiosidades.
 * Cada entrada vira uma query `search?type=video&videoDuration=short`
 * no YouTube Data API v3 (via /api/youtube). Mantenha â‰¤ 6â€“7 queries
 * para nÃ£o estourar cota/rate-limit no rodÃ­zio de `loadMore`.
 */
export const DISCOVERY_QUERIES = [
  'notÃ­cias Brasil hoje',           // Atualidades nacionais
  'notÃ­cias mundo resumo',          // Atualidades globais
  'tecnologia novidades recentes',      // Tecnologia
  'educaÃ§Ã£o dicas estudo',          // EducaÃ§Ã£o
  'curiosidades ciÃªncia fatos',     // Curiosidades (ciÃªncia/geral)
]



