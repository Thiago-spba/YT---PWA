import { useShortsFeed } from '../lib/useShortsFeed'

interface Props {
  onOpen: (videoId: string) => void
}

/**
 * Grade de descoberta dos vídeos curtos — usa o mesmo hook (`useShortsFeed`)
 * que o modo imersivo, então não repete nenhuma busca já feita/em cache:
 * abrir a grade depois do modo imersivo (ou vice-versa) reaproveita os
 * mesmos dados.
 */
export default function ShortsGrid({ onOpen }: Props) {
  const { shorts, loaded, loadingMore, discoveryError, loadMore, retryDiscovery } = useShortsFeed()

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col overflow-y-auto bg-black p-2 sm:p-3">
      {!loaded ? (
        <p className="p-8 text-center text-sm text-neutral-400">Carregando…</p>
      ) : shorts.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-neutral-400">
          {discoveryError ? (
            <>
              <p>{discoveryError}</p>
              <button
                type="button"
                onClick={() => retryDiscovery()}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Tentar de novo
              </button>
            </>
          ) : (
            <p>
              Nenhum vídeo curto por aqui ainda. Adicione pelo Catálogo, ou importe da sua conta
              Google — vídeos de até 1 minuto aparecem aqui automaticamente.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {shorts.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onOpen(v.id)}
              className="group relative aspect-9/16 overflow-hidden rounded-lg bg-neutral-900"
            >
              <img
                src={v.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2 pt-8 text-white">
                <p className="line-clamp-2 text-xs font-medium sm:text-sm">{v.title}</p>
                <p className="truncate text-[11px] text-neutral-300 sm:text-xs">{v.channelTitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loaded && shorts.length > 0 && (
        <div className="flex justify-center p-3">
          <button
            type="button"
            onClick={() => loadMore()}
            disabled={loadingMore}
            className="rounded-full bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  )
}