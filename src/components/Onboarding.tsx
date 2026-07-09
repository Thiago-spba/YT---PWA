import { markOnboardingDone } from '../lib/storage'

interface Props {
  onDone: () => void
}

export default function Onboarding({ onDone }: Props) {
  return (
    <div className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold text-violet-700 dark:text-violet-300">
        Bem-vindo ao YT
      </h1>
      <p className="text-neutral-600 dark:text-neutral-300">
        Este app funciona melhor dentro do navegador Brave, que bloqueia
        anúncios automaticamente. Siga os passos abaixo uma única vez:
      </p>
      <ol className="list-decimal space-y-3 text-left text-neutral-700 dark:text-neutral-200">
        <li>
          Abra este endereço no <strong>navegador Brave</strong> (não em outro
          navegador).
        </li>
        <li>
          Toque no menu do navegador e escolha{' '}
          <strong>"Instalar aplicativo"</strong> (ou "Adicionar à tela
          inicial").
        </li>
        <li>
          Confirme que o <strong>Brave Shields</strong> está ativo (ícone de
          escudo ao lado do endereço) — ele é o responsável por bloquear os
          anúncios.
        </li>
        <li>
          Pronto! Nas próximas vezes o app abre direto no catálogo, sem
          precisar repetir esses passos.
        </li>
      </ol>
      <p className="rounded-lg bg-neutral-100 p-3 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        Os vídeos só podem ser assistidos com internet — não é possível
        baixá-los para ver offline no momento. Essa opção está planejada
        para uma versão futura.
      </p>
      <button
        type="button"
        onClick={() => {
          markOnboardingDone()
          onDone()
        }}
        className="mt-4 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
      >
        Concluir e ir para o catálogo
      </button>
    </div>
  )
}
