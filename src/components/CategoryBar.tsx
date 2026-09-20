interface Category {
  key: string
  label: string
  emoji: string
  query: string
}

const SECTIONS = [
  {
    title: 'Vestibular & Concursos',
    items: [
      { key: 'vestibular', emoji: '📚', label: 'Vestibular', query: 'aula vestibular ENEM redação' },
      { key: 'enem', emoji: '📖', label: 'ENEM', query: 'aula ENEM dicas gabarito redação' },
      { key: 'concursos', emoji: '📝', label: 'Concursos', query: 'curso concurso público dicas aprovação' },
    ]
  },
  {
    title: 'Disciplinas Escolares',
    items: [
      { key: 'matematica', emoji: '➕', label: 'Matemática', query: 'aula de matemática exercícios' },
      { key: 'historia', emoji: '📜', label: 'História', query: 'aula de história brasil mundo' },
      { key: 'portugues', emoji: '✍️', label: 'Português', query: 'aula de português redação gramática' },
      { key: 'fisica', emoji: '⚡', label: 'Física', query: 'aula de física exercícios' },
      { key: 'quimica', emoji: '🧪', label: 'Química', query: 'aula de química experimentos' },
      { key: 'biologia', emoji: '🧬', label: 'Biologia', query: 'aula de biologia evolução' },
      { key: 'geografia', emoji: '🌍', label: 'Geografia', query: 'aula de geografia brasil mundo' },
      { key: 'filosofia', emoji: '💭', label: 'Filosofia', query: 'aula de filosofia sociologia' },
      { key: 'artes', emoji: '🎨', label: 'Artes', query: 'aula de artes história da arte' },
    ]
  },
  {
    title: 'Pedagogia & Educação',
    items: [
      { key: 'pedagogia', emoji: '🧑‍🏫', label: 'Pedagogia', query: 'pedagogia educação aula curso português' },
      { key: 'didatica', emoji: '📋', label: 'Didática', query: 'didática metodologia ensino aula português' },
      { key: 'psicopedagogia', emoji: '🧠', label: 'Psicopedagogia', query: 'psicopedagogia aprendizagem dificuldades escolares' },
      { key: 'gestao_escolar', emoji: '🏫', label: 'Gestão Escolar', query: 'gestão escolar coordenação pedagógica curso' },
      { key: 'educ_inclusiva', emoji: '🤝', label: 'Educação Inclusiva', query: 'educação inclusiva libras deficiência curso' },
      { key: 'metodologias', emoji: '✨', label: 'Metodologias Ativas', query: 'metodologias ativas sala de aula inovação' },
      { key: 'bncc', emoji: '📘', label: 'BNCC & Currículo', query: 'BNCC currículo base nacional comum educação' },
      { key: 'educ_digital', emoji: '💻', label: 'Educação Digital', query: 'tecnologia educação sala de aula digital' },
    ]
  },
  {
    title: 'Tecnologia & Engenharia',
    items: [
      { key: 'programacao', emoji: '💻', label: 'Programação', query: 'aula de programação iniciante português' },
      { key: 'engenharia', emoji: '🖥️', label: 'Eng. Computação', query: 'engenharia da computação aula português' },
      { key: 'hardware', emoji: '🔧', label: 'Hardware', query: 'hardware eletrônica montagem computador' },
      { key: 'redes', emoji: '🌐', label: 'Redes', query: 'redes de computadores infraestrutura ti' },
      { key: 'ia', emoji: '🤖', label: 'Inteligência Artificial', query: 'inteligência artificial curso português' },
      { key: 'cyber', emoji: '🔒', label: 'Cibersegurança', query: 'cibersegurança segurança digital curso' },
      { key: 'mobile', emoji: '📱', label: 'Dev Mobile', query: 'desenvolvimento mobile android ios' },
      { key: 'cloud', emoji: '☁️', label: 'Cloud Computing', query: 'cloud computing aws azure google' },
    ]
  },
  {
    title: 'Mistérios & Curiosidades',
    items: [
      { key: 'misterios', emoji: '🔮', label: 'Mistérios', query: 'mistérios inexplicáveis curiosidades mundo' },
      { key: 'ovnis', emoji: '👽', label: 'Ovnis & ET', query: 'ovnis extraterrestres fenômenos documentário' },
      { key: 'curiosidades', emoji: '🧩', label: 'Curiosidades', query: 'curiosidades fascinantes fatos incríveis mundo' },
      { key: 'civilizacoes', emoji: '🏛️', label: 'Civilizações', query: 'civilizações antigas mistérios arqueologia' },
      { key: 'mente', emoji: '🧠', label: 'Mente Humana', query: 'mente humana comportamento psicologia curiosidades' },
      { key: 'natureza', emoji: '🌊', label: 'Natureza Incrível', query: 'fenômenos natureza incrível mundo curiosidades' },
      { key: 'casos', emoji: '🕵️', label: 'Casos Reais', query: 'casos reais misteriosos documentário' },
      { key: 'ciencia_curiosa', emoji: '⚗️', label: 'Ciência Curiosa', query: 'ciência curiosidades experimentos fascinantes' },
    ]
  },
  {
    title: 'Idiomas',
    items: [
      { key: 'ingles', emoji: '🇺🇸', label: 'Inglês', query: 'aula de inglês para brasileiros' },
      { key: 'espanhol', emoji: '🇪🇸', label: 'Espanhol', query: 'aula de espanhol para brasileiros' },
    ]
  },
  {
    title: 'Humanas & Sociais',
    items: [
      { key: 'direito', emoji: '⚖️', label: 'Direito', query: 'aula de direito jurídico curso' },
      { key: 'financas', emoji: '💰', label: 'Finanças', query: 'finanças pessoais investimentos educação' },
      { key: 'empreend', emoji: '🚀', label: 'Empreendedorismo', query: 'empreendedorismo negócios startup português' },
      { key: 'psicologia', emoji: '🧠', label: 'Psicologia', query: 'psicologia comportamento humano curso' },
    ]
  },
  {
    title: 'Saúde & Bem-estar',
    items: [
      { key: 'saude', emoji: '🏥', label: 'Saúde', query: 'saúde bem estar medicina dicas' },
      { key: 'educ_fisica', emoji: '🏋️', label: 'Ed. Física', query: 'educação física exercícios treino saúde' },
    ]
  },
  {
    title: 'Ciência & Universo',
    items: [
      { key: 'astronomia', emoji: '🔭', label: 'Astronomia', query: 'astronomia espaço universo explicação' },
      { key: 'ciencias', emoji: '🔬', label: 'Ciências', query: 'ciências curiosidades experimentos' },
      { key: 'documentarios', emoji: '🎬', label: 'Documentários', query: 'documentário nacional história ciência' },
      { key: 'planeta', emoji: '🌋', label: 'Planeta Terra', query: 'planeta terra geologia vulcões curiosidades' },
      { key: 'genetica', emoji: '🧬', label: 'Genética', query: 'genética DNA evolução humana explicação' },
    ]
  },
]

import { useState } from 'react'

interface Props {
  onSelect: (query: string) => void
}

export default function CategoryBar({ onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<Category[]>([])

  function handleSelect(cat: Category) {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.key !== cat.key)
      return [cat, ...filtered].slice(0, 5)
    })
    setOpen(false)
    onSelect(cat.query)
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl bg-violet-600 px-4 py-3 text-left text-white hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-600"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🥇</span>
          <div>
            <p className="text-sm font-semibold">O que vamos aprender?</p>
            <p className="text-xs text-violet-200">Categorias educacionais</p>
          </div>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-5 w-5 text-violet-200 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {history.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {history.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleSelect(cat)}
              className="flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {section.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {section.items.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-violet-400 dark:hover:bg-violet-900/20 dark:hover:text-violet-300"
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
