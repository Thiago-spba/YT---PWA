import { useState } from 'react'

type Panel = 'privacy' | 'terms' | null

export default function Footer() {
  const [open, setOpen] = useState<Panel>(null)
  const year = new Date().getFullYear()

  function toggle(panel: Panel) {
    setOpen((current) => (current === panel ? null : panel))
  }

  return (
    <footer className="mt-8 border-t border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-neutral-700 dark:text-neutral-200">YT</strong>{' '}
          — {year}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">
          Thiago Fernando — Engenheiro da Computação e Desenvolvedor
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggle('privacy')}
            className="underline decoration-dotted underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Privacidade
          </button>
          <button
            type="button"
            onClick={() => toggle('terms')}
            className="underline decoration-dotted underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Termos de uso
          </button>
        </div>
      </div>

      {open === 'privacy' && (
        <div className="mx-auto mt-3 max-w-[1800px] space-y-2 rounded-lg bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
            Privacidade
          </h3>
          <p>
            Este app não tem servidor próprio e não coleta, armazena ou
            compartilha dados pessoais em nenhum backend. Favoritos,
            histórico de vídeos assistidos, PIN de responsável e o limite de
            tempo de uso ficam salvos apenas no armazenamento local do
            navegador (localStorage/IndexedDB) do dispositivo usado — nada
            sai do aparelho.
          </p>
          <p>
            A busca e os dados de vídeo (título, miniatura, canal) vêm da
            YouTube Data API, do Google, sujeita à{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Política de Privacidade do Google
            </a>
            . A reprodução usa o modo de privacidade avançada do YouTube
            (`youtube-nocookie.com`), que reduz cookies de rastreamento até
            que o vídeo seja iniciado.
          </p>
          <p>
            O PIN de responsável é guardado apenas como um hash (não como
            texto), mas por ser uma proteção local ao navegador, limpar os
            dados do site no dispositivo remove essa proteção — não existe
            recuperação remota de PIN, pois não há conta nem servidor.
          </p>
        </div>
      )}

      {open === 'terms' && (
        <div className="mx-auto mt-3 max-w-[1800px] space-y-2 rounded-lg bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
            Termos de uso
          </h3>
          <p>
            Este é um aplicativo pessoal, sem fins comerciais, criado para
            uso próprio e familiar de quem o mantém. Não é um produto
            distribuído publicamente nem afiliado ao YouTube ou ao Google.
          </p>
          <p>
            Todo o conteúdo de vídeo exibido pertence aos respectivos
            criadores e ao YouTube/Google, e seu uso está sujeito aos{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Termos de Serviço do YouTube
            </a>
            . Este app apenas organiza e exibe esse conteúdo através do
            player e da API oficiais — não hospeda, baixa nem redistribui
            vídeos.
          </p>
          <p>
            É necessária conexão com a internet para assistir aos vídeos;
            não há suporte a reprodução offline nesta versão. O uso por
            crianças deve ser supervisionado por um responsável, que é
            quem controla o catálogo e as configurações através do PIN.
          </p>
        </div>
      )}
    </footer>
  )
}
