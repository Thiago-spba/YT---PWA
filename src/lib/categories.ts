// Classificador por palavra-chave — de propósito simples e sem IA: só
// checa se o texto (busca ou título de vídeo) contém alguma palavra da
// lista de cada categoria. Usado pelo algoritmo de recomendação por
// histórico (item 3), que não deve depender de nenhuma API externa.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  religioso: [
    'gospel', 'hino', 'louvor', 'adoracao', 'crista', 'cristao', 'evangelica', 'evangelico',
    'catolica', 'catolico', 'igreja', 'jesus', 'deus', 'oracao', 'biblia', 'prega', 'sermao',
    'missa', 'adventista', 'espirito santo',
  ],
  misterio_ovni: ['ovni', 'ufo', 'alien', 'misterio', 'paranormal', 'inexplicavel', 'enigma'],
  musica: ['musica', 'clipe', 'show ao vivo', 'cover', 'instrumental', 'karaoke'],
  noticias: ['noticia', 'jornal', 'reportagem', 'atualidades'],
  entretenimento: ['engracado', 'comedia', 'prank', 'desafio', 'challenge', 'humor'],
  educativo: ['aula', 'tutorial', 'aprenda', 'curso', 'como fazer', 'dica de'],
  infantil: ['infantil', 'desenho', 'crianca', 'kids'],
  esportes: ['futebol', 'campeonato', 'gol', 'esporte', 'jogo do'],
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/** Classifica um texto (busca ou título/canal de vídeo) em 0+ categorias conhecidas. */
export function categorize(text: string): string[] {
  const normalized = normalize(text)
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((k) => normalized.includes(k)))
    .map(([category]) => category)
}

/**
 * Mapa da categoria OFICIAL do YouTube (snippet.categoryId, devolvida pela
 * própria Data API — a mesma taxonomia que aparece em "Assistir mais tarde"
 * no YouTube) para as categorias internas deste app. Muito mais confiável
 * que adivinhar pelo título: cobre títulos que não citam nenhuma palavra-
 * chave (ex.: "ACERTO FECHADO NO TIMÃO" é categoria 17/Sports no YouTube,
 * mas não contém "futebol", "gol" nem "campeonato" no texto).
 *
 * IDs de referência (googleapis videoCategories, estáveis globalmente):
 * 1 Film & Animation, 10 Music, 17 Sports, 22 People & Blogs, 23 Comedy,
 * 24 Entertainment, 25 News & Politics, 26 Howto & Style, 27 Education,
 * 28 Science & Technology.
 *
 * Categorias sem equivalente oficial no YouTube (religioso, misterio_ovni,
 * infantil) continuam dependendo só das palavras-chave abaixo — por isso
 * `categorize` (palavra-chave) nunca é substituída, só complementada.
 */
const YOUTUBE_CATEGORY_MAP: Record<string, string> = {
  '10': 'musica',
  '17': 'esportes',
  '25': 'noticias',
  '23': 'entretenimento',
  '24': 'entretenimento',
  '1': 'entretenimento',
  '27': 'educativo',
  '26': 'educativo',
  '28': 'educativo',
}

/** Classifica pelo categoryId oficial do YouTube. Vazio se não houver categoria mapeada ou o id não vier. */
export function categorizeByYouTubeId(categoryId: string | undefined | null): string[] {
  if (!categoryId) return []
  const mapped = YOUTUBE_CATEGORY_MAP[categoryId]
  return mapped ? [mapped] : []
}
