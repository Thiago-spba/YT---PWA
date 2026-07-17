import { useEffect, useRef } from 'react'
import type { ShortsFeed } from '../lib/useShortsFeed'

interface Props {
  onOpen: (videoId: string) => void
  sharedFeed: ShortsFeed
}

export default function ShortsGrid({ onOpen, sharedFeed }: Props) {
  const { shorts, loaded, loadingMore, discoveryError, loadMore, retryDiscovery } = sharedFeed
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !loaded) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loaded, loadingMore])

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
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 sm:gap-3">
            {shorts.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onOpen(v.id)}
                className="group relative overflow-hidden rounded-xl bg-neutral-900 shadow-md transition-transform hover:scale-[1.03] active:scale-95"
              >
                <div className="aspect-video w-full overflow-hidden bg-neutral-800">
                  <img
                    src={v.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-1.5 text-left">
                  <p className="line-clamp-2 text-[11px] font-medium leading-tight text-white sm:text-xs">
                    {v.title}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-neutral-400 sm:text-[11px]">
                    {v.channelTitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <p className="mt-2 text-center text-sm text-neutral-400">Carregando mais vídeos…</p>
          )}
        </>
      )}
    </div>
  )
}