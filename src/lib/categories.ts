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
