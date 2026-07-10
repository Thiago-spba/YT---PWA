import { useEffect, useState } from 'react'
import type { Video } from '../types'
import VideoCard from './VideoCard'
import { addToCatalog, listCatalog, removeFromCatalog } from '../lib/db'
import { extractVideoId, getVideoById, hasApiKey, YoutubeApiError } from '../lib/youtube'

interface Props {
  onSelect: (video: Video) => void
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

export default function Catalog({ onSelect }: Props) {
  const [catalog, setCatalog] = useState<Video[]>([])
  const [input, setInput] = useState('')
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
    if (!id) {
      setStatus('Isso não parece um link válido do YouTube. Cole o link do vídeo ou canal.')
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
      setStatus('Vídeo adicionado ao catálogo.')
      setInput('')
    } catch (err) {
      setStatus(err instanceof YoutubeApiError ? err.message : 'Algo deu errado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(video: Video) {
    await removeFromCatalog(video.id)
    setCatalog(await listCatalog())
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      <div className="mx-auto mb-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Colar link de vídeo do YouTube para adicionar ao catálogo"
            autoComplete="off"
            className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800"
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Adicionar ao catálogo"
            title="Adicionar ao catálogo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <PlusIcon />
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Procurando um vídeo novo? Use a busca na aba{' '}
          <strong className="text-neutral-700 dark:text-neutral-200">Início</strong>.
        </p>
      </div>

      {status && (
        <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-neutral-600 dark:text-neutral-300">
          {status}
        </p>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Meus Canais</h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum vídeo no catálogo ainda. Cole um link acima para começar.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {catalog.map((v) => (
              <VideoCard key={v.id} video={v} onSelect={onSelect} onDelete={handleRemove} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
