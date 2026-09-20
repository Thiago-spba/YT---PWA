
export const DISCOVERY_QUERIES_POOL: string[] = [
  'aula vestibular ENEM matematica',
  'aula de fisica exercicios resolvidos',
  'aula de quimica experimentos',
  'aula de biologia celula evolucao',
  'aula de historia brasil imperio',
  'aula de portugues redacao nota mil',
  'curiosidades cientificas incriveis mundo',
  'misterios inexplicaveis documentario',
  'inteligencia artificial explicacao portugues',
  'programacao iniciante python portugues',
  'engenharia da computacao aula',
  'hardware como funciona computador',
  'astronomia espaco universo documentario',
  'civilizacoes antigas misterios arqueologia',
  'ovnis fenomenos inexplicaveis documentario',
  'mente humana psicologia comportamento',
  'financas pessoais investimentos iniciante',
  'concurso publico dicas aprovacao',
  'metodologias ativas sala de aula',
  'pedagogia educacao inovacao',
  'ciencias experimentos fascinantes',
  'planeta terra geologia vulcoes',
  'genetica dna evolucao humana',
  'ciberseguranca seguranca digital curso',
  'redes de computadores infraestrutura',
  'desenvolvimento mobile android iniciante',
  'cloud computing aws google azure',
  'direito juridico curso gratuito',
  'empreendedorismo negocios startup brasil',
  'aula de ingles para brasileiros iniciante',
  'aula de espanhol para brasileiros',
  'fenomenos natureza incrivel mundo',
  'casos reais misteriosos documentario',
  'saude bem estar medicina dicas',
  'educacao fisica treino exercicios',
  'documentario nacional historia brasil',
  'matematica financeira concurso',
  'interpretacao de texto portugues enem',
  'geopolitica mundo atual explicado',
  'filosofia pensadores ideias resumo',
]

export const CATEGORY_QUERIES: Record<string, string> = {
  vestibular: 'aula vestibular ENEM redacao',
  enem: 'aula ENEM dicas gabarito redacao',
  concursos: 'curso concurso publico dicas aprovacao',
  matematica: 'aula de matematica exercicios',
  historia: 'aula de historia brasil mundo',
  portugues: 'aula de portugues redacao gramatica',
  fisica: 'aula de fisica exercicios',
  quimica: 'aula de quimica experimentos',
  biologia: 'aula de biologia evolucao',
  geografia: 'aula de geografia brasil mundo',
  filosofia: 'aula de filosofia sociologia',
  artes: 'aula de artes historia da arte',
  pedagogia: 'pedagogia educacao aula curso portugues',
  didatica: 'didatica metodologia ensino aula',
  psicopedagogia: 'psicopedagogia aprendizagem dificuldades',
  gestao_escolar: 'gestao escolar coordenacao pedagogica',
  educ_inclusiva: 'educacao inclusiva libras deficiencia',
  metodologias: 'metodologias ativas sala de aula',
  bncc: 'BNCC curriculo base nacional educacao',
  educ_digital: 'tecnologia educacao sala de aula digital',
  programacao: 'aula de programacao iniciante portugues',
  engenharia_computacao: 'engenharia da computacao aula portugues',
  hardware: 'hardware eletronica montagem computador',
  redes: 'redes de computadores infraestrutura ti',
  inteligencia_artificial: 'inteligencia artificial curso portugues',
  ciberseguranca: 'ciberseguranca seguranca digital curso',
  mobile: 'desenvolvimento mobile android ios',
  cloud: 'cloud computing aws azure google',
  misterios: 'misterios inexplicaveis curiosidades mundo',
  ovnis: 'ovnis extraterrestres fenomenos documentario',
  curiosidades: 'curiosidades fascinantes fatos incriveis',
  civilizacoes: 'civilizacoes antigas misterios arqueologia',
  mente: 'mente humana comportamento psicologia',
  natureza: 'fenomenos natureza incrivel mundo',
  casos: 'casos reais misteriosos documentario',
  ciencia_curiosa: 'ciencia curiosidades experimentos fascinantes',
  ingles: 'aula de ingles para brasileiros',
  espanhol: 'aula de espanhol para brasileiros',
  direito: 'aula de direito juridico curso',
  financas: 'financas pessoais investimentos educacao',
  empreendedorismo: 'empreendedorismo negocios startup portugues',
  psicologia: 'psicologia comportamento humano curso',
  saude: 'saude bem estar medicina dicas',
  educacao_fisica: 'educacao fisica exercicios treino saude',
  astronomia: 'astronomia espaco universo explicacao',
  ciencias: 'ciencias curiosidades experimentos',
  documentarios: 'documentario nacional historia ciencia',
  planeta: 'planeta terra geologia vulcoes curiosidades',
  genetica: 'genetica DNA evolucao humana explicacao',
  educativo: 'aula tutorial como fazer',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildPersonalizedQueries(topCategories: string[]): string[] {
  const mapped = topCategories
    .map((cat) => CATEGORY_QUERIES[cat])
    .filter((q): q is string => Boolean(q))
  if (mapped.length > 0) return mapped
  return shuffle(DISCOVERY_QUERIES_POOL).slice(0, 5)
}
