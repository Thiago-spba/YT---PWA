import { useEffect, useRef, useState } from 'react'
import type { Video } from '../types'
import { isFavorite, listCatalog, recordHistory, toggleFavorite } from '../lib/db'
import { loadYouTubeApi, type YTPlayer } from '../lib/youtubePlayer'

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
      />
    </svg>
  )
}

function MuteIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path strokeLinecap="round" d="M16 9l6 6M22 9l-6 6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
      <path strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5z" />
      <path strokeLinecap="round" d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
    </svg>
  )
}

function ShortPlayer({ video, muted }: { video: Video; muted: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)

  useEffect(() => {
    recordHistory(video)
    let cancelled = false
    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: video.id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          rel: 0,
          autoplay: 1,
          loop: 1,
          playlist: video.id,
          controls: 0,
          playsinline: 1,
          modestbranding: 1,
        },
        events: {
          onReady: () => playerRef.current?.mute(),
        },
      })
    })
    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id])

  useEffect(() => {
    if (muted) playerRef.current?.mute()
    else playerRef.current?.unMute()
  }, [muted])

  return <div ref={containerRef} className="h-full w-full" />
}

interface ItemProps {
  video: Video
  active: boolean
  muted: boolean
  onToggleMute: () => void
  onVisible: () => void
}

function ShortItem({ video, active, muted, onToggleMute, onVisible }: ItemProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    isFavorite(video.id).then(setFavorite)
  }, [video.id])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onVisible()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFavorite() {
    setFavorite(await toggleFavorite(video))
  }

  return (
    <div
      ref={ref}
      className="relative flex h-[calc(100dvh-56px)] w-full snap-start items-center justify-center bg-black"
    >
      <div className="relative h-full max-h-full aspect-[9/16] max-w-full overflow-hidden bg-neutral-900">
        {active ? (
          <ShortPlayer video={video} muted={muted} />
        ) : (
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
          <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
          <p className="text-xs text-neutral-300">{video.channelTitle}</p>
        </div>

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-4">
          <button
            type="button"
            onClick={handleFavorite}
            title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
            aria-label={favorite ? 'Remover dos favoritos' : 'Favoritar'}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${
              favorite ? 'bg-violet-600' : 'bg-black/50 hover:bg-black/70'
            }`}
          >
            <StarIcon filled={favorite} />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Ativar som' : 'Silenciar'}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <MuteIcon muted={muted} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Shorts() {
  const [shorts, setShorts] = useState<Video[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listCatalog().then((all) => {
      const onlyShorts = all.filter((v) => v.isShort)
      setShorts(onlyShorts)
      if (onlyShorts.length > 0) setActiveId(onlyShorts[0].id)
      setLoaded(true)
    })
  }, [])

  if (loaded && shorts.length === 0) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Nenhum vídeo curto no catálogo ainda. Vídeos de até 1 minuto adicionados pelo campo de
        busca ou importados da sua conta Google aparecem aqui automaticamente.
      </div>
    )
  }

  return (
    <div className="h-[calc(100dvh-56px)] snap-y snap-mandatory overflow-y-scroll">
      {shorts.map((v) => (
        <ShortItem
          key={v.id}
          video={v}
          active={v.id === activeId}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onVisible={() => setActiveId(v.id)}
        />
      ))}
    </div>
  )
}
