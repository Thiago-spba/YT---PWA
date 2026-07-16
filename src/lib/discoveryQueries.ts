/**
 * Consultas fixas usadas para popular os feeds de descoberta (Início e
 * Shorts) sem depender de vídeos importados — ficam só aqui, num lugar
 * único, pra Início e Shorts nunca saírem de sincronia sobre o que
 * "o feed padrão" mostra.
 *
 * Nicho: Atualidades, Tecnologia, Educação, Engenharia e Curiosidades.
 * Cada entrada vira uma query `search?type=video&videoDuration=short`
 * no YouTube Data API v3 (via /api/youtube). Mantenha ≤ 6–7 queries
 * para não estourar cota/rate-limit no rodízio de `loadMore`.
 */
export const DISCOVERY_QUERIES = [
  'notícias Brasil hoje',           // Atualidades nacionais
  'notícias mundo resumo',          // Atualidades globais
  'tecnologia novidades 2024',      // Tecnologia
  'educação dicas estudo',          // Educação
  'matemática explicação rápida',   // Matemática
  'engenharia da computação',       // Engenharia da computação
  'curso técnico profissionalizante', // Ensino técnico profissionalizante
  'curiosidades ciência fatos',     // Curiosidades (ciência/geral)
]
