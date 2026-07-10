import { useEffect, useState } from 'react'
import type { Video } from '../types'
import VideoCard from './VideoCard'
import { hasApiKey, searchRecent, YoutubeApiError } from '../lib/youtube'

interface Props {
  onSelect: (video: Video, queue?: Video[]) => void
}

// As consultas usadas para popular o feed ficam só aqui internamente —
// a tela não identifica nem separa por estilo, é um feed único.
const QUERIES = ['música evangélica', 'música adventista hinos', 'música católica']

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function Home({ onSelect }: Props) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasApiKey()) {
      setLoading(false)
      return
    }
    Promise.all(QUERIES.map((q) => searchRecent(q, 12).catch(() => [])))
      .then((results) => {
        const seen = new Set<string>()
        const merged = results.flat().filter((v) => {
          if (seen.has(v.id)) return false
          seen.add(v.id)
          return true
        })
        setVideos(shuffle(merged))
      })
      .catch((err) => {
        setError(err instanceof YoutubeApiError ? err.message : 'Erro ao carregar vídeos.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (!hasApiKey()) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        A página Início busca vídeos recentes automaticamente, mas isso depende da busca
        estar configurada (chave da YouTube Data API). Enquanto isso, use a aba "Meus
        Canais" para adicionar vídeos por link.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      {loading && <p className="text-sm text-neutral-500 dark:text-neutral-400">Carregando…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && videos.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhum vídeo encontrado agora.
        </p>
      )}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onSelect={(video) => onSelect(video, videos.filter((sv) => sv.id !== video.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
