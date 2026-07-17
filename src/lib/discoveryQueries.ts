/**
 * Queries de descoberta para Home e Shorts.
 * Mantidas separadas para cada contexto poder ter seu próprio nicho.
 * Ordem embaralhada a cada sessão — veja Home.tsx e useShortsFeed.ts.
 */

// Usadas nos Shorts (vídeos curtos)
export const DISCOVERY_QUERIES = [
  'notícias Brasil hoje',
  'notícias mundo resumo',
  'tecnologia novidades 2025',
  'curiosidades ciência fatos',
  'matemática explicação rápida',
  'engenharia da computação',
  'Naruhodo podcast',
  'Henrique Caldeira história',
  'Rodrigo Silva motivação',
  'pregação evangélica reflexão',
  'curso técnico profissionalizante',
  'inteligência artificial explicação',
]

// Usadas na Home (vídeos longos e variados)
export const HOME_QUERIES = [
  'notícias Brasil hoje',
  'notícias mundo 2025',
  'tecnologia novidades 2025',
  'inteligência artificial tutorial',
  'engenharia da computação aula',
  'programação dicas',
  'curiosidades ciência',
  'matemática aula completa',
  'história do Brasil aula',
  'Naruhodo',
  'canal Tupã ciência',
  'Henrique Caldeira doutor história',
  'Rodrigo Silva',
  'pregação evangélica reflexão',
  'pregação motivacional fé',
  'física química biologia aula',
]
