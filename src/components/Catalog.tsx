import { useEffect, useRef, useState } from 'react'
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
  const [suggestions, setSuggestions] = useState<Video[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    listCatalog().then(setCatalog)
  }, [])

  // Sugestões enquanto digita (debounce) — só quando parece texto de
  // busca, não quando já é um link/ID reconhecível.
  useEffect(() => {
    const value = input.trim()
    if (!hasApiKey() || value.length < 3 || extractVideoId(value)) {
      setSuggestions([])
      return
    }
    setSuggestLoading(true)
    const timer = setTimeout(() => {
      searchVideos(value)
        .then((videos) => setSuggestions(videos.slice(0, 6)))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestLoading(false))
    }, 450)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = input.trim()
    if (!value) return

    const id = extractVideoId(value)
    setLoading(true)
    setStatus(null)
    setResults([])
    setShowSuggestions(false)

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

  async function handleAddSuggestion(video: Video) {
    setShowSuggestions(false)
    setInput('')
    const full = hasApiKey() ? await getVideoById(video.id).catch(() => null) : null
    await addToCatalog(full ?? video)
    setCatalog(await listCatalog())
    setStatus(`"${video.title}" adicionado ao catálogo.`)
  }

  async function handleRemove(id: string) {
    await removeFromCatalog(id)
    setCatalog(await listCatalog())
  }

  return (
    <div className="mx-auto max-w-[1800px] p-4">
      <div ref={boxRef} className="relative mx-auto mb-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={
              hasApiKey() ? 'Buscar ou colar link de vídeo do YouTube' : 'Colar link de vídeo do YouTube'
            }
            autoComplete="off"
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

        {showSuggestions && (suggestLoading || suggestions.length > 0) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {suggestLoading && suggestions.length === 0 && (
              <p className="p-3 text-sm text-neutral-500 dark:text-neutral-400">Buscando…</p>
            )}
            {suggestions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleAddSuggestion(v)}
                className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <img src={v.thumbnailUrl} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-neutral-800 dark:text-neutral-100">
                    {v.title}
                  </span>
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {v.channelTitle}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
