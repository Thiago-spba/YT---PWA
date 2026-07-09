import { useEffect, useState } from 'react'
import type { Video } from '../types'
import VideoCard from './VideoCard'
import { addToCatalog, listCatalog, removeFromCatalog } from '../lib/db'
import { extractVideoId, getVideoById, hasApiKey, searchVideos, YoutubeApiError } from '../lib/youtube'

interface Props {
  onSelect: (video: Video) => void
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="M21 21l-4.3-4.3" />
    </svg>
  )
}

export default function Catalog({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<Video[]>([])
  const [input, setInput] = useState('')
  const [results, setResults] = useState<Video[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listCatalog().then(setCatalog)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = input.trim()
    if (!value) return

    const id = extractVideoId(value)
    setLoading(true)
    setStatus(null)
    setResults([])

    try {
      if (id) {
        const video = hasApiKey()
          ? await getVideoById(id)
          : { id, title: id, channelTitle: '', thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` }
        if (!video) {
          setStatus('Vídeo não encontrado.')
          return
        }
        await addToCatalog(video)
        setCatalog(await listCatalog())
        setStatus('Vídeo adicionado ao catálogo.')
        setInput('')
      } else if (hasApiKey()) {
        setResults(await searchVideos(value))
      } else {
        setStatus(
          'Isso não parece um link do YouTube. Para buscar por texto, a busca precisa estar configurada.',
        )
      }
    } catch (err) {
      setStatus(err instanceof YoutubeApiError ? err.message : 'Algo deu errado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(id: string) {
    await removeFromCatalog(id)
    setCatalog(await listCatalog())
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      <form onSubmit={handleSubmit} className="mx-auto mb-6 flex max-w-2xl gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hasApiKey() ? 'Buscar ou colar link de vídeo do YouTube' : 'Colar link de vídeo do YouTube'
          }
          className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Buscar ou adicionar"
          title="Buscar ou adicionar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <SearchIcon />
        </button>
      </form>

      {status && (
        <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-300">
          {status}
        </p>
      )}

      {results.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">Resultados da busca</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((v) => (
              <VideoCard key={v.id} video={v} onSelect={onSelect} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Catálogo</h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum vídeo no catálogo ainda. Cole um link acima para começar.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {catalog.map((v) => (
              <div key={v.id} className="relative">
                <VideoCard video={v} onSelect={onSelect} />
                <button
                  type="button"
                  onClick={() => handleRemove(v.id)}
                  className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white"
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
