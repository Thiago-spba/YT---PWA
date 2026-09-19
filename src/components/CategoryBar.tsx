interface Category {
  key: string
  label: string
  emoji: string
  query: string
}

const CATEGORIES: Category[] = [
  // Vestibular & Concursos
  { key: 'vestibular', emoji: '📚', label: 'Vestibular', query: 'aula vestibular ENEM redacao' },
  { key: 'enem', emoji: '📖', label: 'ENEM', query: 'aula ENEM dicas gabarito redacao' },
  { key: 'concursos', emoji: '📝', label: 'Concursos', query: 'curso concurso publico dicas aprovacao' },

  // Disciplinas
  { key: 'matematica', emoji: '➕', label: 'Matemática', query: 'aula de matematica exercicios' },
  { key: 'historia', emoji: '📜', label: 'História', query: 'aula de historia brasil mundo' },
  { key: 'portugues', emoji: '📝', label: 'Português', query: 'aula de portugues redacao gramatica' },
  { key: 'fisica', emoji: '⚡', label: 'Física', query: 'aula de fisica exercicios' },
  { key: 'quimica', emoji: '🧪', label: 'Química', query: 'aula de quimica experimentos' },
  { key: 'biologia', emoji: '🧬', label: 'Biologia', query: 'aula de biologia celula evolucao' },
  { key: 'geografia', emoji: '🌍', label: 'Geografia', query: 'aula de geografia brasil mundo' },
  { key: 'filosofia', emoji: '💭', label: 'Filosofia', query: 'aula de filosofia sociologia' },
  { key: 'artes', emoji: '🎨', label: 'Artes', query: 'aula de artes historia arte' },

  // Tecnologia & Engenharia
  { key: 'programacao', emoji: '💻', label: 'Programação', query: 'aula de programacao curso iniciante portugues' },
  { key: 'engenharia', emoji: '🖥', label: 'Eng. Computação', query: 'engenharia da computacao aula curso portugues' },
  { key: 'hardware', emoji: '🔧', label: 'Hardware', query: 'hardware eletronica montagem computador portugues' },
  { key: 'redes', emoji: '🌐', label: 'Redes', query: 'redes de computadores infraestrutura ti portugues' },
  { key: 'ia', emoji: '🤖', label: 'Inteligência Artificial', query: 'inteligencia artificial curso explicacao portugues' },
  { key: 'cyber', emoji: '🔒', label: 'Cibersegurança', query: 'ciberseguranca seguranca digital curso portugues' },
  { key: 'mobile', emoji: '📱', label: 'Dev Mobile', query: 'desenvolvimento mobile app android ios portugues' },
  { key: 'cloud', emoji: '☁', label: 'Cloud Computing', query: 'cloud computing aws azure google portugues' },

  // Idiomas
  { key: 'ingles', emoji: '🇺🇸', label: 'Inglês', query: 'aula de ingles para brasileiros iniciante' },
  { key: 'espanhol', emoji: '🇪🇸', label: 'Espanhol', query: 'aula de espanhol para brasileiros iniciante' },

  // Humanas & Sociais
  { key: 'direito', emoji: '⚖', label: 'Direito', query: 'aula de direito juridico curso portugues' },
  { key: 'financas', emoji: '💰', label: 'Finanças', query: 'financas pessoais investimentos educacao financeira portugues' },
  { key: 'empreendedorismo', emoji: '🚀', label: 'Empreendedorismo', query: 'empreendedorismo negocios startup portugues' },
  { key: 'psicologia', emoji: '🧠', label: 'Psicologia', query: 'psicologia saude mental comportamento portugues' },

  // Saude
  { key: 'saude', emoji: '🏥', label: 'Saúde', query: 'saude bem estar medicina dicas portugues' },
  { key: 'educacao_fisica', emoji: '🏋', label: 'Educação Física', query: 'educacao fisica exercicios treino saude portugues' },

  // Entretenimento Educacional
  { key: 'documentarios', emoji: '🎬', label: 'Documentários', query: 'documentario nacional historia ciencia portugues' },
  { key: 'ciencias', emoji: '🔬', label: 'Ciências', query: 'ciencias curiosidades experimentos explicacao portugues' },
  { key: 'astronomia', emoji: '📡', label: 'Astronomia', query: 'astronomia espaco universo explicacao portugues' },
  { key: 'gospel', emoji: '✝', label: 'Gospel & Pregacoes', query: 'pregacao evangelica gospel mensagem portugues' },
]

interface Props {
  onSelect: (query: string) => void
}

export default function CategoryBar({ onSelect }: Props) {
  return (
    <div className="mb-4 overflow-x-auto">
      <div className="flex gap-2 pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => onSelect(cat.query)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-violet-500 dark:hover:bg-violet-900/20 dark:hover:text-violet-300"
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
