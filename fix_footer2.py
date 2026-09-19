content = """import { useState } from 'react'

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
          <strong className="text-neutral-700 dark:text-neutral-200">\U0001F947 TF Edu</strong>{" "}
          \u2013 {year}
        </span>
        <span className="text-neutral-500 dark:text-neutral-400">
          Thiago Fernando \u2013 Engenheiro da Computa\u00e7\u00e3o e Desenvolvedor
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={() => toggle("privacy")}
            className="underline decoration-dotted underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200">
            Privacidade
          </button>
          <button type="button" onClick={() => toggle("terms")}
            className="underline decoration-dotted underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200">
            Termos de uso
          </button>
          <a href="mailto:thiagorpba@gmail.com"
            className="underline decoration-dotted underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200">
            Contato
          </a>
        </div>
      </div>

      {open === "privacy" && (
        <div className="mx-auto mt-3 max-w-[1800px] space-y-2 rounded-lg bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
            Pol\u00edtica de Privacidade
          </h3>
          <p>
            <strong>Uso da YouTube API Services:</strong> Este aplicativo utiliza os
            YouTube API Services do Google para buscar e exibir v\u00eddeos. Ao usar
            este app, voc\u00ea tamb\u00e9m est\u00e1 sujeito \u00e0{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">
              Pol\u00edtica de Privacidade do Google
            </a>.
          </p>
          <p>
            <strong>Dados acessados via YouTube API:</strong> O app acessa dados
            p\u00fablicos do YouTube como t\u00edtulos, miniaturas, canais e contagens de
            visualiza\u00e7\u00f5es. N\u00e3o acessamos dados privados da sua conta do
            YouTube sem sua autoriza\u00e7\u00e3o expl\u00edcita.
          </p>
          <p>
            <strong>Dados armazenados no seu dispositivo:</strong> Favoritos,
            hist\u00f3rico de v\u00eddeos assistidos, playlists e prefer\u00eancias ficam
            salvos apenas localmente no seu navegador (localStorage/IndexedDB).
            Nenhum dado pessoal \u00e9 enviado a servidores externos.
          </p>
          <p>
            <strong>Cookies e tecnologias similares:</strong> O app usa localStorage
            e IndexedDB para armazenar prefer\u00eancias localmente. A reprodu\u00e7\u00e3o
            usa o modo privacidade avan\u00e7ada do YouTube (youtube-nocookie.com),
            que reduz cookies de rastreamento.
          </p>
          <p>
            <strong>Compartilhamento de dados:</strong> N\u00e3o vendemos nem
            compartilhamos seus dados. Os dados de v\u00eddeo v\u00eam da YouTube Data API v3
            e pertencem ao YouTube/Google.
          </p>
          <p>
            <strong>Contato:</strong> D\u00favidas sobre privacidade:{" "}
            <a href="mailto:thiagorpba@gmail.com" className="underline">
              thiagorpba@gmail.com
            </a>
          </p>
        </div>
      )}

      {open === "terms" && (
        <div className="mx-auto mt-3 max-w-[1800px] space-y-2 rounded-lg bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
            Termos de uso
          </h3>
          <p>
            TF Edu \u00e9 uma plataforma pessoal de aprendizado que utiliza a
            YouTube Data API v3 para exibir conte\u00fado educacional.
            N\u00e3o \u00e9 afiliado ao YouTube ou ao Google.
          </p>
          <p>
            Todo o conte\u00fado de v\u00eddeo pertence aos respectivos criadores e ao
            YouTube/Google, sujeito aos{" "}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer" className="underline">
              Termos de Servi\u00e7o do YouTube
            </a>
            . Este app apenas organiza e exibe esse conte\u00fado atrav\u00e9s do
            player e da API oficiais \u2013 n\u00e3o hospeda, baixa nem redistribui v\u00eddeos.
          </p>
          <p>
            \u00c9 necess\u00e1ria conex\u00e3o com a internet. O uso por crian\u00e7as
            deve ser supervisionado por um respons\u00e1vel.
          </p>
        </div>
      )}
    </footer>
  )
}
"""
with open("src/components/Footer.tsx", "w", encoding="utf-8") as f:
    f.write(content.lstrip("\n"))
print("Footer.tsx reescrito com sucesso!")
