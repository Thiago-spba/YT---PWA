component = """import React from 'react'

interface Category {
  key: string
  label: string
  emoji: string
  query: string
}

const CATEGORIES: Category[] = [
  // Vestibular & Concursos
  { key: 'vestibular', emoji: '\U0001F4DA', label: 'Vestibular', query: 'aula vestibular ENEM redacao' },
  { key: 'enem', emoji: '\U0001F4D6', label: 'ENEM', query: 'aula ENEM dicas gabarito redacao' },
  { key: 'concursos', emoji: '\U0001F4DD', label: 'Concursos', query: 'curso concurso publico dicas aprovacao' },

  // Disciplinas
  { key: 'matematica', emoji: '\u2795', label: 'Matem\u00e1tica', query: 'aula de matematica exercicios' },
  { key: 'historia', emoji: '\U0001F4DC', label: 'Hist\u00f3ria', query: 'aula de historia brasil mundo' },
  { key: 'portugues', emoji: '\U0001F4DD', label: 'Portugu\u00eas', query: 'aula de portugues redacao gramatica' },
  { key: 'fisica', emoji: '\u26A1', label: 'F\u00edsica', query: 'aula de fisica exercicios' },
  { key: 'quimica', emoji: '\U0001F9EA', label: 'Qu\u00edmica', query: 'aula de quimica experimentos' },
  { key: 'biologia', emoji: '\U0001F9EC', label: 'Biologia', query: 'aula de biologia celula evolucao' },
  { key: 'geografia', emoji: '\U0001F30D', label: 'Geografia', query: 'aula de geografia brasil mundo' },
  { key: 'filosofia', emoji: '\U0001F4AD', label: 'Filosofia', query: 'aula de filosofia sociologia' },
  { key: 'artes', emoji: '\U0001F3A8', label: 'Artes', query: 'aula de artes historia arte' },

  // Tecnologia & Engenharia
  { key: 'programacao', emoji: '\U0001F4BB', label: 'Programa\u00e7\u00e3o', query: 'aula de programacao curso iniciante portugues' },
  { key: 'engenharia', emoji: '\U0001F5A5', label: 'Eng. Computa\u00e7\u00e3o', query: 'engenharia da computacao aula curso portugues' },
  { key: 'hardware', emoji: '\U0001F527', label: 'Hardware', query: 'hardware eletronica montagem computador portugues' },
  { key: 'redes', emoji: '\U0001F310', label: 'Redes', query: 'redes de computadores infraestrutura ti portugues' },
  { key: 'ia', emoji: '\U0001F916', label: 'Intelig\u00eancia Artificial', query: 'inteligencia artificial curso explicacao portugues' },
  { key: 'cyber', emoji: '\U0001F512', label: 'Ciberseguran\u00e7a', query: 'ciberseguranca seguranca digital curso portugues' },
  { key: 'mobile', emoji: '\U0001F4F1', label: 'Dev Mobile', query: 'desenvolvimento mobile app android ios portugues' },
  { key: 'cloud', emoji: '\u2601', label: 'Cloud Computing', query: 'cloud computing aws azure google portugues' },

  // Idiomas
  { key: 'ingles', emoji: '\U0001F1FA\U0001F1F8', label: 'Ingl\u00eas', query: 'aula de ingles para brasileiros iniciante' },
  { key: 'espanhol', emoji: '\U0001F1EA\U0001F1F8', label: 'Espanhol', query: 'aula de espanhol para brasileiros iniciante' },

  // Humanas & Sociais
  { key: 'direito', emoji: '\u2696', label: 'Direito', query: 'aula de direito juridico curso portugues' },
  { key: 'financas', emoji: '\U0001F4B0', label: 'Finan\u00e7as', query: 'financas pessoais investimentos educacao financeira portugues' },
  { key: 'empreendedorismo', emoji: '\U0001F680', label: 'Empreendedorismo', query: 'empreendedorismo negocios startup portugues' },
  { key: 'psicologia', emoji: '\U0001F9E0', label: 'Psicologia', query: 'psicologia saude mental comportamento portugues' },

  // Saude
  { key: 'saude', emoji: '\U0001F3E5', label: 'Sa\u00fade', query: 'saude bem estar medicina dicas portugues' },
  { key: 'educacao_fisica', emoji: '\U0001F3CB', label: 'Educa\u00e7\u00e3o F\u00edsica', query: 'educacao fisica exercicios treino saude portugues' },

  // Entretenimento Educacional
  { key: 'documentarios', emoji: '\U0001F3AC', label: 'Document\u00e1rios', query: 'documentario nacional historia ciencia portugues' },
  { key: 'ciencias', emoji: '\U0001F52C', label: 'Ci\u00eancias', query: 'ciencias curiosidades experimentos explicacao portugues' },
  { key: 'astronomia', emoji: '\U0001F4E1', label: 'Astronomia', query: 'astronomia espaco universo explicacao portugues' },
  { key: 'gospel', emoji: '\u271D', label: 'Gospel & Pregacoes', query: 'pregacao evangelica gospel mensagem portugues' },
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
"""

with open('src/components/CategoryBar.tsx', 'w', encoding='utf-8') as f:
    f.write(component.lstrip("\\n"))
print('CategoryBar.tsx criado com sucesso!')
