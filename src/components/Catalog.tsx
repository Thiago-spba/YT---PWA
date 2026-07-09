import { useEffect, useState } from 'react'
import type { Video } from '../types'
import VideoCard from './VideoCard'
import { addToCatalog, listCatalog, removeFromCatalog } from '../lib/db'
import { extractVideoId, getVideoById, hasApiKey, searchVideos, YoutubeApiError } from '../lib/youtube'

interface Props {
  onSelect: (video: Video) => void
}

export default function Catalog({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<Video[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Video[]>([])
  const [addInput, setAddInput] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listCatalog().then(setCatalog)
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setStatus(null)
    try {
      setResults(await searchVideos(query))
    } catch (err) {
      setStatus(err instanceof YoutubeApiError ? err.message : 'Erro ao buscar vídeos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const id = extractVideoId(addInput)
    if (!id) {
      setStatus('Cole um link ou ID de vídeo válido do YouTube.')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const video = hasApiKey()
        ? await getVideoById(id)
        : { id, title: id, channelTitle: '', thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` }
      if (!video) {
        setStatus('Vídeo não encontrado.')
        return
      }
      await addToCatalog(video)
      setCatalog(await listCatalog())
      setAddInput('')
    } catch (err) {
      setStatus(err instanceof YoutubeApiError ? err.message : 'Erro ao adicionar vídeo.')
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
      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={addInput}
          onChange={(e) => setAddInput(e.target.value)}
          placeholder="Colar link do vídeo do YouTube para adicionar ao catálogo"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {hasApiKey() && (
        <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vídeos no YouTube"
            className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded bg-neutral-700 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Buscar
          </button>
        </form>
      )}

      {status && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{status}</p>}

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
