/**
 * Queries de descoberta para Home e Shorts.
 * Divididas em dois grupos:
 * - DISCOVERY_QUERIES: usadas nos Shorts (vídeos curtos)
 * - HOME_QUERIES: usadas na Home (vídeos longos/variados)
 *
 * Canais fixos adicionados: Naruhodo, Tupã, Henrique Caldeira,
 * Rodrigo Silva, pregações evangélicas e conteúdo acadêmico.
 */

export const DISCOVERY_QUERIES = [
  // Atualidades
  'notícias Brasil hoje',
  'notícias mundo resumo',
  // Tecnologia
  'tecnologia novidades 2025',
  'inteligência artificial explicação',
  // Educação / Ciência
  'curiosidades ciência fatos',
  'matemática explicação rápida',
  'engenharia da computação',
  // Canais acadêmicos conhecidos
  'Naruhodo podcast',
  'Tupã ciência',
  'Henrique Caldeira história',
  // Outros
  'curso técnico profissionalizante',
  'Rodrigo Silva motivação',
]

export const HOME_QUERIES = [
  // Atualidades
  'notícias Brasil hoje',
  'notícias mundo 2025',
  // Tecnologia & Engenharia
  'tecnologia novidades 2025',
  'inteligência artificial tutorial',
  'engenharia da computação aula',
  'programação dicas',
  // Educação & Ciência
  'curiosidades ciência',
  'matemática aula completa',
  'física química biologia aula',
  'história do Brasil aula',
  // Canais acadêmicos
  'Naruhodo',
  'canal Tupã',
  'Henrique Caldeira doutor história',
  'Rodrigo Silva',
  // Pregações
  'pregação evangélica reflexão',
  'pregação motivacional fé',
]