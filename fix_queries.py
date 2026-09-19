content = open('src/lib/discoveryQueries.ts', encoding='utf-8').read()

new_queries = """
export const DISCOVERY_QUERIES = [
  'aula educativa vestibular ENEM',
  'curso online gratuito portugues',
  'tecnologia programacao tutorial',
  'ciencias curiosidades educativo',
  'concurso publico dicas estudo',
]

export const CATEGORY_QUERIES: Record<string, string> = {
  // Vestibular & Concursos
  vestibular: 'aula vestibular ENEM redacao portugues',
  concursos: 'curso concurso publico dicas aprovacao',
  enem: 'aula ENEM dicas gabarito redacao',

  // Disciplinas Escolares
  matematica: 'aula de matematica exercicios portugues',
  historia: 'aula de historia brasil mundo portugues',
  portugues: 'aula de portugues redacao gramatica',
  fisica: 'aula de fisica exercicios portugues',
  quimica: 'aula de quimica experimentos portugues',
  biologia: 'aula de biologia celula evolucao portugues',
  geografia: 'aula de geografia brasil mundo portugues',
  filosofia: 'aula de filosofia sociologia portugues',
  artes: 'aula de artes historia arte portugues',

  // Tecnologia & Engenharia
  programacao: 'aula de programacao curso iniciante portugues',
  engenharia_computacao: 'engenharia da computacao aula curso portugues',
  hardware: 'hardware eletronica montagem computador portugues',
  redes: 'redes de computadores infraestrutura ti portugues',
  inteligencia_artificial: 'inteligencia artificial curso explicacao portugues',
  ciberseguranca: 'ciberseguranca seguranca digital curso portugues',
  mobile: 'desenvolvimento mobile app android ios portugues',
  cloud: 'cloud computing aws azure google cloud portugues',

  // Idiomas
  ingles: 'aula de ingles para brasileiros iniciante',
  espanhol: 'aula de espanhol para brasileiros iniciante',
  portugues_redacao: 'aula de portugues redacao gramatica avancado',

  // Humanas & Sociais
  direito: 'aula de direito juridico curso portugues',
  financas: 'financas pessoais investimentos educacao financeira portugues',
  empreendedorismo: 'empreendedorismo negocios startup portugues',
  psicologia: 'psicologia saude mental comportamento portugues',

  // Saude & Bem-estar
  saude: 'saude bem estar medicina dicas portugues',
  educacao_fisica: 'educacao fisica exercicios treino saude portugues',

  // Entretenimento Educacional
  documentarios: 'documentario nacional historia ciencia portugues',
  ciencias: 'ciencias curiosidades experimentos explicacao portugues',
  astronomia: 'astronomia espaco universo explicacao portugues',
  gospel: 'pregacao evangelica gospel mensagem portugues',

  // Categorias originais mantidas
  religioso: 'louvor gospel musica crista',
  misterio_ovni: 'misterios e curiosidades inexplicaveis',
  musica: 'musica clipe show ao vivo',
  noticias: 'noticias Brasil hoje',
  entretenimento: 'videos de comedia e humor',
  educativo: 'aula tutorial como fazer',
  infantil: 'desenho animado infantil',
  esportes: 'melhores momentos futebol',
}

export function buildPersonalizedQueries(topCategories: string[]): string[] {
  const mapped = topCategories
    .map((category) => CATEGORY_QUERIES[category])
    .filter((q): q is string => Boolean(q))
  return mapped.length > 0 ? mapped : DISCOVERY_QUERIES
}
"""

with open('src/lib/discoveryQueries.ts', 'w', encoding='utf-8') as f:
    f.write(new_queries.lstrip("\\n"))
print('discoveryQueries.ts atualizado com 30 categorias!')
